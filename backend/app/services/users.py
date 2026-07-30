import base64
import binascii
import uuid
from datetime import UTC, datetime

from sqlalchemy import Select, delete, func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache import redis as cache
from app.core.exceptions import AppError, NotFoundError, PermissionDeniedError
from app.core.logging import get_logger
from app.models.follow import Follow
from app.models.user import User
from app.schemas.user import UpdateProfileRequest

log = get_logger(__name__)

PROFILE_CACHE_TTL = 60
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 50


class UsernameTakenError(AppError):
    status_code = 409
    code = "username_taken"
    message = "That username is already taken"


class CannotFollowSelfError(AppError):
    status_code = 400
    code = "cannot_follow_self"
    message = "You cannot follow yourself"


def _now() -> datetime:
    return datetime.now(UTC)


# ---------------------------------------------------------------- cache keys


def _profile_key(viewer_id: uuid.UUID | None, target_id: uuid.UUID) -> str:
    """Cache key for a rendered profile.

    The viewer is part of the key because the response carries is_following and
    is_self, which differ per viewer. Caching on target alone would serve one
    person's relationship flags to everyone (PRD 6B).
    """
    viewer = viewer_id or "anon"
    return f"vibescape:profile:v1:viewer:{viewer}:target:{target_id}"


async def invalidate_profile(target_id: uuid.UUID) -> None:
    """Drop every viewer's cached copy of one profile.

    SCAN rather than a blind DEL because the key includes the viewer, so there is
    one entry per person who looked. Bounded by the prefix so it cannot touch other
    projects sharing this Redis.
    """
    pattern = f"vibescape:profile:v1:viewer:*:target:{target_id}"
    try:
        redis = cache.get_redis()
        keys = [key async for key in redis.scan_iter(match=pattern, count=500)]
        if keys:
            await redis.delete(*keys)
    except Exception as exc:  # noqa: BLE001 - stale cache must not fail a write
        log.warning("profile_cache_invalidation_failed", target=str(target_id), error=str(exc))


# ---------------------------------------------------------------- reads


async def get_by_id(db: AsyncSession, user_id: uuid.UUID) -> User:
    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise NotFoundError("User not found")
    return user


async def get_by_username(db: AsyncSession, username: str) -> User:
    user = await db.scalar(select(User).where(User.username == username.strip().lower()))
    if user is None or not user.is_active:
        raise NotFoundError("User not found")
    return user


async def is_following(db: AsyncSession, follower_id: uuid.UUID, following_id: uuid.UUID) -> bool:
    if follower_id == following_id:
        return False
    found = await db.scalar(
        select(Follow.id).where(
            Follow.follower_id == follower_id, Follow.following_id == following_id
        )
    )
    return found is not None


async def following_set(
    db: AsyncSession, viewer_id: uuid.UUID | None, target_ids: list[uuid.UUID]
) -> set[uuid.UUID]:
    """Which of target_ids the viewer follows.

    One query for the whole page instead of one per row — the difference between a
    list endpoint that scales and an N+1.
    """
    if viewer_id is None or not target_ids:
        return set()

    rows = await db.scalars(
        select(Follow.following_id).where(
            Follow.follower_id == viewer_id, Follow.following_id.in_(target_ids)
        )
    )
    return set(rows.all())


# ---------------------------------------------------------------- writes


async def update_profile(
    db: AsyncSession,
    *,
    actor: User,
    target_id: uuid.UUID,
    payload: UpdateProfileRequest,
) -> User:
    """Update a profile.

    Ownership is checked here rather than only at the route. Being authenticated
    says who you are; it does not say this row is yours. Conflating the two is how
    IDOR ships.
    """
    if actor.id != target_id:
        raise PermissionDeniedError("You can only edit your own profile")

    user = await get_by_id(db, target_id)

    # Only fields actually present in the request body are touched, so an omitted
    # field is left alone while an explicit null clears it.
    provided = payload.model_dump(exclude_unset=True)

    if "username" in provided and provided["username"] != user.username:
        clash = await db.scalar(select(User.id).where(User.username == provided["username"]))
        if clash is not None:
            raise UsernameTakenError()

    if "links" in provided and provided["links"] is not None:
        provided["links"] = [
            {"title": link["title"], "url": str(link["url"])} for link in provided["links"]
        ]

    for field, value in provided.items():
        setattr(user, field, value)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise UsernameTakenError() from None

    await db.refresh(user)
    await invalidate_profile(user.id)
    log.info("profile_updated", user_id=str(user.id), fields=sorted(provided.keys()))
    return user


async def follow(db: AsyncSession, *, follower: User, target_id: uuid.UUID) -> tuple[bool, int]:
    """Follow a user. Returns (following, followers_count).

    Idempotent: following twice is not an error, it just does nothing the second
    time. The unique constraint is what makes that safe under concurrency — two
    simultaneous requests cannot both increment the counter.
    """
    if follower.id == target_id:
        raise CannotFollowSelfError()

    target = await get_by_id(db, target_id)

    db.add(Follow(follower_id=follower.id, following_id=target.id))
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        # Already following. Report current truth rather than an error.
        return True, await _followers_count(db, target_id)

    # Counter updates go through the database rather than a read-modify-write in
    # Python, so concurrent follows cannot lose an increment.
    await db.execute(
        update(User).where(User.id == target.id).values(followers_count=User.followers_count + 1)
    )
    await db.execute(
        update(User).where(User.id == follower.id).values(following_count=User.following_count + 1)
    )
    await db.commit()

    await invalidate_profile(target.id)
    await invalidate_profile(follower.id)

    log.info("user_followed", follower=str(follower.id), target=str(target_id))
    return True, await _followers_count(db, target_id)


async def unfollow(db: AsyncSession, *, follower: User, target_id: uuid.UUID) -> tuple[bool, int]:
    """Unfollow. Idempotent, and never lets a counter go negative."""
    target = await get_by_id(db, target_id)

    result = await db.execute(
        delete(Follow).where(Follow.follower_id == follower.id, Follow.following_id == target.id)
    )

    if result.rowcount:
        # GREATEST guards against a counter drifting below zero if it were ever
        # corrupted; a negative follower count is worse than a slightly stale one.
        await db.execute(
            update(User)
            .where(User.id == target.id)
            .values(followers_count=func.greatest(User.followers_count - 1, 0))
        )
        await db.execute(
            update(User)
            .where(User.id == follower.id)
            .values(following_count=func.greatest(User.following_count - 1, 0))
        )
        await db.commit()
        await invalidate_profile(target.id)
        await invalidate_profile(follower.id)
    else:
        await db.rollback()

    return False, await _followers_count(db, target_id)


async def _followers_count(db: AsyncSession, user_id: uuid.UUID) -> int:
    """Read the counter as a scalar rather than through the ORM object.

    A bulk update() expires the mapped instance, so touching an attribute afterwards
    triggers a synchronous lazy load and raises MissingGreenlet under asyncio. A
    plain scalar select sidesteps the identity map entirely.
    """
    return await db.scalar(select(User.followers_count).where(User.id == user_id)) or 0


# ---------------------------------------------------------------- lists


def encode_cursor(moment: datetime) -> str:
    """Opaque, URL-safe cursor.

    A bare ISO timestamp cannot be used: its "+00:00" offset decodes as a space in a
    query string, so the cursor arrives corrupted and every second page 400s.
    base64url avoids that and keeps the value opaque, so clients do not build
    dependencies on its contents.
    """
    return base64.urlsafe_b64encode(moment.isoformat().encode()).decode().rstrip("=")


def decode_cursor(cursor: str) -> datetime:
    try:
        padded = cursor + "=" * (-len(cursor) % 4)
        return datetime.fromisoformat(base64.urlsafe_b64decode(padded).decode())
    except (ValueError, TypeError, binascii.Error):
        raise AppError("Invalid cursor", code="invalid_cursor") from None


def _paginate(stmt: Select, *, cursor: str | None, limit: int) -> Select:
    """Keyset pagination on created_at.

    Offset drifts as rows are inserted — with an offset, following someone shifts
    every later page and a row can be shown twice or skipped entirely.
    """
    if cursor:
        stmt = stmt.where(Follow.created_at < decode_cursor(cursor))
    return stmt.order_by(Follow.created_at.desc()).limit(limit + 1)


async def list_followers(
    db: AsyncSession, *, target_id: uuid.UUID, cursor: str | None, limit: int
) -> tuple[list[tuple[User, datetime]], str | None, bool]:
    stmt = (
        select(User, Follow.created_at)
        .join(Follow, Follow.follower_id == User.id)
        .where(Follow.following_id == target_id, User.is_active.is_(True))
    )
    rows = (await db.execute(_paginate(stmt, cursor=cursor, limit=limit))).all()
    return _slice(rows, limit)


async def list_following(
    db: AsyncSession, *, target_id: uuid.UUID, cursor: str | None, limit: int
) -> tuple[list[tuple[User, datetime]], str | None, bool]:
    stmt = (
        select(User, Follow.created_at)
        .join(Follow, Follow.following_id == User.id)
        .where(Follow.follower_id == target_id, User.is_active.is_(True))
    )
    rows = (await db.execute(_paginate(stmt, cursor=cursor, limit=limit))).all()
    return _slice(rows, limit)


def _slice(rows, limit: int):
    """Trim the sentinel row used to detect a further page."""
    has_more = len(rows) > limit
    page = rows[:limit]
    next_cursor = encode_cursor(page[-1][1]) if has_more and page else None
    return [(row[0], row[1]) for row in page], next_cursor, has_more


async def search(db: AsyncSession, *, query: str, limit: int) -> list[User]:
    """Search by username or display name.

    Uses ILIKE with an escaped prefix pattern. Bound parameters keep the value out
    of the SQL text; escaping the wildcards stops a query of "%" matching everyone.
    """
    term = query.strip().lower()
    if not term:
        return []

    escaped = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    pattern = f"%{escaped}%"

    rows = await db.scalars(
        select(User)
        .where(
            User.is_active.is_(True),
            or_(User.username.ilike(pattern), User.display_name.ilike(pattern)),
        )
        # Exact-prefix matches first so searching "chet" surfaces "chetan" above
        # "not_chetan".
        .order_by(User.username.ilike(f"{escaped}%").desc(), User.followers_count.desc())
        .limit(limit)
    )
    return list(rows.all())
