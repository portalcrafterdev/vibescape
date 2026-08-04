import uuid

from sqlalchemy import delete, select, tuple_
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.core.text import extract_mentions
from app.models.mention import Mention
from app.models.post import Post
from app.models.user import User

log = get_logger(__name__)

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 50


async def resolve(db: AsyncSession, text: str | None) -> list[User]:
    """The real, active accounts named in `text`.

    Only resolved handles count. `@notauser` stays plain text rather than becoming a
    row — otherwise the table fills with typos, and a caption could invent mentions
    of names that were never accounts.
    """
    usernames = extract_mentions(text)
    if not usernames:
        return []

    rows = await db.scalars(
        select(User).where(User.username.in_(usernames), User.is_active.is_(True))
    )
    found = {user.username: user for user in rows.all()}

    # Returned in the order they appear in the text, not the order Postgres chose.
    return [found[name] for name in usernames if name in found]


async def _sync(
    db: AsyncSession,
    *,
    text: str | None,
    post_id: uuid.UUID | None = None,
    comment_id: uuid.UUID | None = None,
) -> list[User]:
    """Make the stored mentions match the text. Does not commit."""
    target = Mention.post_id == post_id if post_id else Mention.comment_id == comment_id

    users = await resolve(db, text)
    wanted = {user.id for user in users}

    current = set(
        (await db.scalars(select(Mention.user_id).where(target))).all()  # type: ignore[arg-type]
    )

    removed = current - wanted
    if removed:
        await db.execute(delete(Mention).where(target, Mention.user_id.in_(removed)))  # type: ignore[arg-type]

    added = wanted - current
    if added:
        await db.execute(
            pg_insert(Mention)
            .values(
                [
                    {
                        "id": uuid.uuid4(),
                        "user_id": user_id,
                        "post_id": post_id,
                        "comment_id": comment_id,
                    }
                    for user_id in added
                ]
            )
            .on_conflict_do_nothing()
        )

    return users


async def sync_for_post(db: AsyncSession, *, post_id: uuid.UUID, caption: str | None) -> list[User]:
    return await _sync(db, text=caption, post_id=post_id)


async def sync_for_comment(
    db: AsyncSession, *, comment_id: uuid.UUID, body: str | None
) -> list[User]:
    return await _sync(db, text=body, comment_id=comment_id)


# ---------------------------------------------------------------- reads


async def _for_targets(
    db: AsyncSession, column, target_ids: list[uuid.UUID]
) -> dict[uuid.UUID, list[User]]:
    if not target_ids:
        return {}

    rows = await db.execute(
        select(column, User)
        .join(User, User.id == Mention.user_id)
        .where(column.in_(target_ids), User.is_active.is_(True))
        .order_by(Mention.created_at.asc())
    )

    grouped: dict[uuid.UUID, list[User]] = {}
    for target_id, user in rows.all():
        grouped.setdefault(target_id, []).append(user)
    return grouped


async def for_posts(db: AsyncSession, post_ids: list[uuid.UUID]) -> dict[uuid.UUID, list[User]]:
    """Mentions across a whole page of posts in one query."""
    return await _for_targets(db, Mention.post_id, post_ids)


async def for_comments(
    db: AsyncSession, comment_ids: list[uuid.UUID]
) -> dict[uuid.UUID, list[User]]:
    return await _for_targets(db, Mention.comment_id, comment_ids)


async def list_posts_mentioning(
    db: AsyncSession, *, user_id: uuid.UUID, cursor: str | None, limit: int
) -> tuple[list[tuple[Post, User]], str | None, bool]:
    """Posts whose caption names this user, newest first."""
    from app.services.posts import decode_cursor, encode_cursor

    stmt = (
        select(Post, User)
        .join(Mention, Mention.post_id == Post.id)
        .join(User, User.id == Post.author_id)
        .where(Mention.user_id == user_id, User.is_active.is_(True))
    )

    if cursor:
        after_time, after_id = decode_cursor(cursor)
        stmt = stmt.where(tuple_(Post.created_at, Post.id) < (after_time, after_id))

    stmt = stmt.order_by(Post.created_at.desc(), Post.id.desc()).limit(limit + 1)
    rows = (await db.execute(stmt)).all()

    has_more = len(rows) > limit
    page = rows[:limit]
    next_cursor = (
        encode_cursor(page[-1][0].created_at, page[-1][0].id) if has_more and page else None
    )
    return [(row[0], row[1]) for row in page], next_cursor, has_more
