import uuid

from sqlalchemy import delete, func, select, tuple_, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.core.text import MAX_HASHTAGS, extract_hashtags
from app.models.hashtag import Hashtag, PostHashtag
from app.models.post import Post

log = get_logger(__name__)

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 50
SEARCH_LIMIT = 20


# ---------------------------------------------------------------- writes


async def _get_or_create(db: AsyncSession, tags: list[str]) -> dict[str, uuid.UUID]:
    """Map each tag to its row id, creating the rows that do not exist yet.

    ON CONFLICT DO NOTHING rather than "select, then insert what is missing": two
    posts using the same brand-new tag at the same moment both see it missing, and
    the second insert would otherwise fail the unique constraint and lose the write.
    """
    if not tags:
        return {}

    rows = await db.execute(select(Hashtag.tag, Hashtag.id).where(Hashtag.tag.in_(tags)))
    found = {tag: tag_id for tag, tag_id in rows.all()}

    missing = [tag for tag in tags if tag not in found]
    if not missing:
        return found

    await db.execute(
        pg_insert(Hashtag)
        .values([{"id": uuid.uuid4(), "tag": tag} for tag in missing])
        .on_conflict_do_nothing(index_elements=["tag"])
    )

    # Re-read rather than trusting the insert's returning clause: a conflicting row
    # inserted by a concurrent request is the one we need, and it is not returned.
    rows = await db.execute(select(Hashtag.tag, Hashtag.id).where(Hashtag.tag.in_(missing)))
    found.update({tag: tag_id for tag, tag_id in rows.all()})
    return found


def merge(caption: str | None, explicit: list[str] | None) -> list[str]:
    """Tags written in the caption, plus any the composer collected separately."""
    wanted = extract_hashtags(caption)

    for tag in explicit or []:
        if tag not in wanted:
            wanted.append(tag)

    return wanted[:MAX_HASHTAGS]


async def sync_for_post(
    db: AsyncSession, *, post_id: uuid.UUID, caption: str | None, explicit: list[str] | None = None
) -> list[str]:
    """Make the post's stored tags match its caption. Returns the resulting tags.

    A diff rather than delete-all-then-insert: rewriting every row on each caption
    edit would churn `posts_count` for tags that never changed.

    Does not commit — the caller owns the transaction, so a post and its tags land
    together or not at all.
    """
    wanted = merge(caption, explicit)

    rows = await db.execute(
        select(Hashtag.tag, Hashtag.id)
        .join(PostHashtag, PostHashtag.hashtag_id == Hashtag.id)
        .where(PostHashtag.post_id == post_id)
    )
    current = {tag: tag_id for tag, tag_id in rows.all()}

    to_add = [tag for tag in wanted if tag not in current]
    to_remove = [tag_id for tag, tag_id in current.items() if tag not in wanted]

    if to_remove:
        await db.execute(
            delete(PostHashtag).where(
                PostHashtag.post_id == post_id, PostHashtag.hashtag_id.in_(to_remove)
            )
        )
        await db.execute(
            update(Hashtag)
            .where(Hashtag.id.in_(to_remove))
            .values(posts_count=func.greatest(Hashtag.posts_count - 1, 0))
        )

    if to_add:
        ids = await _get_or_create(db, to_add)
        new_ids = [ids[tag] for tag in to_add if tag in ids]

        if new_ids:
            await db.execute(
                pg_insert(PostHashtag)
                .values(
                    [
                        {"id": uuid.uuid4(), "post_id": post_id, "hashtag_id": tag_id}
                        for tag_id in new_ids
                    ]
                )
                .on_conflict_do_nothing(index_elements=["post_id", "hashtag_id"])
            )
            await db.execute(
                update(Hashtag)
                .where(Hashtag.id.in_(new_ids))
                .values(posts_count=Hashtag.posts_count + 1)
            )

    return wanted


async def release_post(db: AsyncSession, post_id: uuid.UUID) -> None:
    """Drop a post's tag counts before it is deleted.

    The join rows go on their own through ON DELETE CASCADE, but the cascade cannot
    decrement `posts_count`, so that has to happen here first.
    """
    tag_ids = (
        await db.scalars(select(PostHashtag.hashtag_id).where(PostHashtag.post_id == post_id))
    ).all()

    if tag_ids:
        await db.execute(
            update(Hashtag)
            .where(Hashtag.id.in_(tag_ids))
            .values(posts_count=func.greatest(Hashtag.posts_count - 1, 0))
        )


# ---------------------------------------------------------------- reads


async def for_posts(db: AsyncSession, post_ids: list[uuid.UUID]) -> dict[uuid.UUID, list[str]]:
    """Tags for a whole page of posts in one query.

    A feed page holds up to 50 posts; asking per post would be 50 round trips for a
    single screen.
    """
    if not post_ids:
        return {}

    rows = await db.execute(
        select(PostHashtag.post_id, Hashtag.tag)
        .join(Hashtag, Hashtag.id == PostHashtag.hashtag_id)
        .where(PostHashtag.post_id.in_(post_ids))
        .order_by(PostHashtag.created_at.asc())
    )

    grouped: dict[uuid.UUID, list[str]] = {}
    for post_id, tag in rows.all():
        grouped.setdefault(post_id, []).append(tag)
    return grouped


async def get(db: AsyncSession, tag: str) -> Hashtag | None:
    return await db.scalar(select(Hashtag).where(Hashtag.tag == tag.lower()))


async def search(db: AsyncSession, *, query: str, limit: int) -> list[Hashtag]:
    """Tags starting with `query`, most used first.

    Prefix match, not a substring one: this backs a type-ahead, where "tra" should
    offer "travel", and an unanchored LIKE could not use the index on `tag`.
    """
    term = query.strip().lstrip("#").lower()
    if not term:
        return []

    # The term is a bound parameter, never interpolated. Escaping the LIKE
    # metacharacters stops a "%" in the box matching every tag in the table.
    escaped = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")

    rows = await db.scalars(
        select(Hashtag)
        .where(Hashtag.tag.like(f"{escaped}%", escape="\\"))
        .order_by(Hashtag.posts_count.desc(), Hashtag.tag.asc())
        .limit(limit)
    )
    return list(rows.all())


async def list_posts(
    db: AsyncSession, *, tag: str, cursor: str | None, limit: int
) -> tuple[list[Post], str | None, bool]:
    """Posts carrying a tag, newest first. Same keyset as the feed."""
    from app.services.posts import decode_cursor, encode_cursor

    stmt = (
        select(Post)
        .join(PostHashtag, PostHashtag.post_id == Post.id)
        .join(Hashtag, Hashtag.id == PostHashtag.hashtag_id)
        .where(Hashtag.tag == tag.lower())
    )

    if cursor:
        after_time, after_id = decode_cursor(cursor)
        stmt = stmt.where(tuple_(Post.created_at, Post.id) < (after_time, after_id))

    stmt = stmt.order_by(Post.created_at.desc(), Post.id.desc()).limit(limit + 1)
    rows = (await db.scalars(stmt)).all()

    has_more = len(rows) > limit
    page = list(rows[:limit])
    next_cursor = encode_cursor(page[-1].created_at, page[-1].id) if has_more and page else None
    return page, next_cursor, has_more
