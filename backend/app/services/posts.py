import base64
import binascii
import json
import uuid
from datetime import UTC, datetime

from sqlalchemy import Select, delete, func, or_, select, tuple_, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache import redis as cache
from app.core.exceptions import AppError, NotFoundError, PermissionDeniedError
from app.core.logging import get_logger
from app.models.follow import Follow
from app.models.post import Post, PostLike
from app.models.user import User

log = get_logger(__name__)

FEED_CACHE_TTL = 30
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 50


def _now() -> datetime:
    return datetime.now(UTC)


# ---------------------------------------------------------------- cursors


def encode_cursor(created_at: datetime, post_id: uuid.UUID) -> str:
    """Keyset cursor over (created_at, id).

    The id breaks ties: two posts created in the same microsecond would otherwise
    make the ordering unstable, so a row could repeat across pages or be skipped.
    base64url because a raw ISO timestamp carries "+00:00" and "+" decodes as a
    space in a query string.
    """
    raw = f"{created_at.isoformat()}|{post_id}"
    return base64.urlsafe_b64encode(raw.encode()).decode().rstrip("=")


def decode_cursor(cursor: str) -> tuple[datetime, uuid.UUID]:
    try:
        padded = cursor + "=" * (-len(cursor) % 4)
        moment, _, ident = base64.urlsafe_b64decode(padded).decode().partition("|")
        return datetime.fromisoformat(moment), uuid.UUID(ident)
    except (ValueError, TypeError, binascii.Error):
        raise AppError("Invalid cursor", code="invalid_cursor") from None


# ---------------------------------------------------------------- cache


def _feed_key(viewer_id: uuid.UUID, cursor: str | None, limit: int) -> str:
    """Feed cache key.

    Built through user_scoped_key, which raises without a viewer id. The feed is
    per-person by definition — a key missing the viewer would serve one user's feed
    to everyone, which is the single worst bug available in this codebase (PRD 6B).
    """
    return cache.user_scoped_key("feed", viewer_id, cursor or "start", limit)


async def invalidate_feed(viewer_id: uuid.UUID) -> None:
    pattern = f"vibescape:feed:u{viewer_id}:*"
    try:
        redis = cache.get_redis()
        keys = [key async for key in redis.scan_iter(match=pattern, count=500)]
        if keys:
            await redis.delete(*keys)
    except Exception as exc:  # noqa: BLE001 - a stale cache must not fail a write
        log.warning("feed_cache_invalidation_failed", viewer=str(viewer_id), error=str(exc))


# ---------------------------------------------------------------- reads


async def get_post(db: AsyncSession, post_id: uuid.UUID) -> Post:
    post = await db.get(Post, post_id)
    if post is None:
        raise NotFoundError("Post not found")
    return post


async def liked_set(
    db: AsyncSession, viewer_id: uuid.UUID, post_ids: list[uuid.UUID]
) -> set[uuid.UUID]:
    """Which of these posts the viewer has liked — one query for the page."""
    if not post_ids:
        return set()
    rows = await db.scalars(
        select(PostLike.post_id).where(
            PostLike.user_id == viewer_id, PostLike.post_id.in_(post_ids)
        )
    )
    return set(rows.all())


def _keyset(stmt: Select, cursor: str | None, limit: int) -> Select:
    if cursor:
        after_time, after_id = decode_cursor(cursor)
        stmt = stmt.where(tuple_(Post.created_at, Post.id) < (after_time, after_id))
    return stmt.order_by(Post.created_at.desc(), Post.id.desc()).limit(limit + 1)


async def list_feed(
    db: AsyncSession, *, viewer_id: uuid.UUID, cursor: str | None, limit: int
) -> tuple[list[tuple[Post, User]], str | None, bool]:
    """Posts from people the viewer follows, plus their own.

    A join against follows rather than a fan-out-on-write timeline. That is the right
    shape at this size; it stops being so once accounts have very large followings,
    which is a Phase 9 concern.
    """
    followed = select(Follow.following_id).where(Follow.follower_id == viewer_id)

    stmt = (
        select(Post, User)
        .join(User, User.id == Post.author_id)
        .where(or_(Post.author_id.in_(followed), Post.author_id == viewer_id))
        .where(User.is_active.is_(True))
    )

    rows = (await db.execute(_keyset(stmt, cursor, limit))).all()
    return _slice(rows, limit)


async def list_by_author(
    db: AsyncSession, *, author_id: uuid.UUID, cursor: str | None, limit: int
) -> tuple[list[Post], str | None, bool]:
    """Profile grid. Pinned posts first, then newest.

    Pinned ordering is applied only on the first page: mixing a boolean into the
    keyset would need it in the cursor too, and pinned state can change between
    requests, which would make the ordering unstable mid-scroll.
    """
    stmt = select(Post).where(Post.author_id == author_id)

    if cursor:
        after_time, after_id = decode_cursor(cursor)
        stmt = stmt.where(tuple_(Post.created_at, Post.id) < (after_time, after_id))
        stmt = stmt.order_by(Post.created_at.desc(), Post.id.desc())
    else:
        stmt = stmt.order_by(Post.pinned.desc(), Post.created_at.desc(), Post.id.desc())

    rows = (await db.scalars(stmt.limit(limit + 1))).all()
    has_more = len(rows) > limit
    page = list(rows[:limit])
    next_cursor = encode_cursor(page[-1].created_at, page[-1].id) if has_more and page else None
    return page, next_cursor, has_more


def _slice(rows, limit: int):
    has_more = len(rows) > limit
    page = rows[:limit]
    next_cursor = (
        encode_cursor(page[-1][0].created_at, page[-1][0].id) if has_more and page else None
    )
    return [(row[0], row[1]) for row in page], next_cursor, has_more


# ---------------------------------------------------------------- writes


async def create_post(
    db: AsyncSession, *, author: User, image_url: str, caption: str | None
) -> Post:
    post = Post(author_id=author.id, image_url=image_url, caption=caption)
    db.add(post)

    await db.execute(
        update(User).where(User.id == author.id).values(posts_count=User.posts_count + 1)
    )
    await db.commit()
    await db.refresh(post)

    # The author must see their own post immediately. Followers' cached feeds expire
    # on their own within FEED_CACHE_TTL — invalidating every follower on each post
    # would be O(followers) Redis work on the write path.
    await invalidate_feed(author.id)

    log.info("post_created", post_id=str(post.id), author=str(author.id))
    return post


async def update_post(
    db: AsyncSession, *, actor: User, post_id: uuid.UUID, caption, pinned
) -> Post:
    post = await get_post(db, post_id)
    if post.author_id != actor.id:
        raise PermissionDeniedError("You can only edit your own posts")

    if caption is not ...:
        post.caption = caption
    if pinned is not None:
        post.pinned = pinned

    await db.commit()
    await db.refresh(post)
    await invalidate_feed(actor.id)
    return post


async def delete_post(db: AsyncSession, *, actor: User, post_id: uuid.UUID) -> None:
    """Delete a post.

    Ownership is checked here, not just at the route. Authentication says who the
    caller is; it does not say the row is theirs.
    """
    post = await get_post(db, post_id)
    if post.author_id != actor.id:
        raise PermissionDeniedError("You can only delete your own posts")

    await db.delete(post)
    await db.execute(
        update(User)
        .where(User.id == actor.id)
        .values(posts_count=func.greatest(User.posts_count - 1, 0))
    )
    await db.commit()
    await invalidate_feed(actor.id)
    log.info("post_deleted", post_id=str(post_id), actor=str(actor.id))


async def like(db: AsyncSession, *, user: User, post_id: uuid.UUID) -> tuple[bool, int]:
    """Like a post. Idempotent — liking twice does not double-count."""
    post = await get_post(db, post_id)

    db.add(PostLike(post_id=post.id, user_id=user.id))
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        return True, await _likes_count(db, post_id)

    await db.execute(
        update(Post).where(Post.id == post.id).values(likes_count=Post.likes_count + 1)
    )
    await db.commit()
    await invalidate_feed(user.id)
    return True, await _likes_count(db, post_id)


async def unlike(db: AsyncSession, *, user: User, post_id: uuid.UUID) -> tuple[bool, int]:
    post = await get_post(db, post_id)

    result = await db.execute(
        delete(PostLike).where(PostLike.post_id == post.id, PostLike.user_id == user.id)
    )

    if result.rowcount:
        await db.execute(
            update(Post)
            .where(Post.id == post.id)
            .values(likes_count=func.greatest(Post.likes_count - 1, 0))
        )
        await db.commit()
        await invalidate_feed(user.id)
    else:
        await db.rollback()

    return False, await _likes_count(db, post_id)


async def _likes_count(db: AsyncSession, post_id: uuid.UUID) -> int:
    """Read the counter as a scalar.

    A bulk update() expires the mapped instance, so reading the attribute afterwards
    triggers a synchronous lazy load and raises MissingGreenlet under asyncio.
    """
    return await db.scalar(select(Post.likes_count).where(Post.id == post_id)) or 0


# ---------------------------------------------------------------- cached feed


async def cached_feed_page(
    db: AsyncSession, *, viewer_id: uuid.UUID, cursor: str | None, limit: int, builder
) -> dict:
    """Read-through cache around one feed page.

    Cache-aside rather than write-through: a serialisation bug can only produce a
    slow request, never a corrupted row. A Redis outage falls through to Postgres.
    """
    key = _feed_key(viewer_id, cursor, limit)

    hit = await cache.cache_get(key)
    if hit:
        try:
            return json.loads(hit)
        except ValueError:
            log.warning("feed_cache_corrupt", key=key)

    payload = await builder()
    await cache.cache_set(key, json.dumps(payload, default=str), FEED_CACHE_TTL)
    return payload
