import uuid

from sqlalchemy import delete, select, tuple_
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, PermissionDeniedError, ValidationError
from app.core.logging import get_logger
from app.models.post import Post
from app.models.tag import PostTag
from app.models.user import User

log = get_logger(__name__)

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 50
MAX_TAGS_PER_POST = 20


async def _active_users(db: AsyncSession, user_ids: list[uuid.UUID]) -> dict[uuid.UUID, User]:
    if not user_ids:
        return {}
    rows = await db.scalars(select(User).where(User.id.in_(user_ids), User.is_active.is_(True)))
    return {user.id: user for user in rows.all()}


TagInput = tuple[uuid.UUID, float | None, float | None]


async def set_for_post(db: AsyncSession, *, post_id: uuid.UUID, wanted: list[TagInput]) -> None:
    """Replace a post's tagged people with `wanted`. Does not commit.

    Every id is checked against a real, active account first. Without that, a caller
    could attach arbitrary UUIDs to a post and the profile "tagged" tab would list
    rows pointing at nobody.
    """
    if len(wanted) > MAX_TAGS_PER_POST:
        raise ValidationError(f"a post may tag at most {MAX_TAGS_PER_POST} people")

    user_ids = [user_id for user_id, _x, _y in wanted]
    known = await _active_users(db, user_ids)

    missing = [str(user_id) for user_id in user_ids if user_id not in known]
    if missing:
        raise ValidationError(f"no such user: {missing[0]}")

    await db.execute(delete(PostTag).where(PostTag.post_id == post_id))

    if wanted:
        await db.execute(
            pg_insert(PostTag)
            .values(
                [
                    {"id": uuid.uuid4(), "post_id": post_id, "user_id": user_id, "x": x, "y": y}
                    for user_id, x, y in wanted
                ]
            )
            .on_conflict_do_nothing(index_elements=["post_id", "user_id"])
        )


async def add(
    db: AsyncSession,
    *,
    actor: User,
    post_id: uuid.UUID,
    user_id: uuid.UUID,
    x: float | None,
    y: float | None,
) -> None:
    """Tag one person. Only the post's author may. Idempotent."""
    post = await db.get(Post, post_id)
    if post is None:
        raise NotFoundError("Post not found")

    if post.author_id != actor.id:
        raise PermissionDeniedError("You can only tag people in your own posts")

    if not await _active_users(db, [user_id]):
        raise ValidationError("no such user")

    existing = await db.scalar(
        select(PostTag.id).where(PostTag.post_id == post_id, PostTag.user_id == user_id)
    )
    if existing is None:
        count = len((await db.scalars(select(PostTag.id).where(PostTag.post_id == post_id))).all())
        if count >= MAX_TAGS_PER_POST:
            raise ValidationError(f"a post may tag at most {MAX_TAGS_PER_POST} people")

    # Re-tagging someone who is already tagged moves their marker rather than
    # failing, which is what dragging a tag in the composer means.
    await db.execute(
        pg_insert(PostTag)
        .values({"id": uuid.uuid4(), "post_id": post_id, "user_id": user_id, "x": x, "y": y})
        .on_conflict_do_update(index_elements=["post_id", "user_id"], set_={"x": x, "y": y})
    )
    await db.commit()

    log.info("post_tag_added", post_id=str(post_id), user_id=str(user_id))


async def remove(db: AsyncSession, *, actor: User, post_id: uuid.UUID, user_id: uuid.UUID) -> None:
    """Remove a tag.

    Two people may: the post's author, and the tagged person themselves. The second
    is not a nicety — without it you cannot get your own name off someone else's
    photo, and being tagged is something other people do to you.
    """
    post = await db.get(Post, post_id)
    if post is None:
        raise NotFoundError("Post not found")

    if actor.id not in (post.author_id, user_id):
        raise PermissionDeniedError("You can only remove your own tag")

    await db.execute(delete(PostTag).where(PostTag.post_id == post_id, PostTag.user_id == user_id))
    await db.commit()

    log.info(
        "post_tag_removed",
        post_id=str(post_id),
        user_id=str(user_id),
        self_removal=actor.id == user_id,
    )


# ---------------------------------------------------------------- reads


async def for_posts(
    db: AsyncSession, post_ids: list[uuid.UUID]
) -> dict[uuid.UUID, list[tuple[User, float | None, float | None]]]:
    """Tagged people across a whole page of posts in one query."""
    if not post_ids:
        return {}

    rows = await db.execute(
        select(PostTag.post_id, User, PostTag.x, PostTag.y)
        .join(User, User.id == PostTag.user_id)
        .where(PostTag.post_id.in_(post_ids), User.is_active.is_(True))
        .order_by(PostTag.created_at.asc())
    )

    grouped: dict[uuid.UUID, list[tuple[User, float | None, float | None]]] = {}
    for post_id, user, x, y in rows.all():
        grouped.setdefault(post_id, []).append((user, x, y))
    return grouped


async def list_tagged_posts(
    db: AsyncSession, *, user_id: uuid.UUID, cursor: str | None, limit: int
) -> tuple[list[Post], str | None, bool]:
    """Posts this user is tagged in — the third tab on a profile."""
    from app.services.posts import decode_cursor, encode_cursor

    stmt = select(Post).join(PostTag, PostTag.post_id == Post.id).where(PostTag.user_id == user_id)

    if cursor:
        after_time, after_id = decode_cursor(cursor)
        stmt = stmt.where(tuple_(Post.created_at, Post.id) < (after_time, after_id))

    stmt = stmt.order_by(Post.created_at.desc(), Post.id.desc()).limit(limit + 1)
    rows = (await db.scalars(stmt)).all()

    has_more = len(rows) > limit
    page = list(rows[:limit])
    next_cursor = encode_cursor(page[-1].created_at, page[-1].id) if has_more and page else None
    return page, next_cursor, has_more
