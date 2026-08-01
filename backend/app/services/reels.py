import uuid
from datetime import UTC, datetime

from sqlalchemy import delete, func, select, tuple_, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, PermissionDeniedError
from app.core.logging import get_logger
from app.models.reel import Reel, ReelLike
from app.models.user import User
from app.services.posts import decode_cursor, encode_cursor

log = get_logger(__name__)

DEFAULT_PAGE_SIZE = 10
MAX_PAGE_SIZE = 30


def _now() -> datetime:
    return datetime.now(UTC)


async def get_reel(db: AsyncSession, reel_id: uuid.UUID) -> Reel:
    reel = await db.get(Reel, reel_id)
    if reel is None:
        raise NotFoundError("Reel not found")
    return reel


async def list_reels(
    db: AsyncSession, *, cursor: str | None, limit: int
) -> tuple[list[tuple[Reel, User]], str | None, bool]:
    """The reels feed.

    Unlike the post feed this is not restricted to people you follow — a reels tab
    that only showed followed accounts would be empty for a new user, which is the
    opposite of what it is for.
    """
    stmt = select(Reel, User).join(User, User.id == Reel.author_id).where(User.is_active.is_(True))

    if cursor:
        after_time, after_id = decode_cursor(cursor)
        stmt = stmt.where(tuple_(Reel.created_at, Reel.id) < (after_time, after_id))

    stmt = stmt.order_by(Reel.created_at.desc(), Reel.id.desc()).limit(limit + 1)
    rows = (await db.execute(stmt)).all()

    has_more = len(rows) > limit
    page = rows[:limit]
    next_cursor = (
        encode_cursor(page[-1][0].created_at, page[-1][0].id) if has_more and page else None
    )
    return [(r[0], r[1]) for r in page], next_cursor, has_more


async def liked_set(
    db: AsyncSession, viewer_id: uuid.UUID, reel_ids: list[uuid.UUID]
) -> set[uuid.UUID]:
    if not reel_ids:
        return set()
    rows = await db.scalars(
        select(ReelLike.reel_id).where(
            ReelLike.user_id == viewer_id, ReelLike.reel_id.in_(reel_ids)
        )
    )
    return set(rows.all())


async def create_reel(
    db: AsyncSession,
    *,
    author: User,
    video_url: str | None,
    album_url: str | None,
    caption: str | None,
    media_asset_id=None,
) -> Reel:
    reel = Reel(
        author_id=author.id,
        video_url=video_url,
        media_asset_id=media_asset_id,
        album_url=album_url,
        caption=caption,
    )
    db.add(reel)
    await db.commit()
    await db.refresh(reel)
    log.info("reel_created", reel_id=str(reel.id), author=str(author.id))
    return reel


async def delete_reel(db: AsyncSession, *, actor: User, reel_id: uuid.UUID) -> None:
    reel = await get_reel(db, reel_id)
    if reel.author_id != actor.id:
        raise PermissionDeniedError("You can only delete your own reels")
    await db.delete(reel)
    await db.commit()


async def like(db: AsyncSession, *, user: User, reel_id: uuid.UUID) -> tuple[bool, int]:
    reel = await get_reel(db, reel_id)

    db.add(ReelLike(reel_id=reel.id, user_id=user.id))
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        return True, await _likes_count(db, reel_id)

    await db.execute(
        update(Reel).where(Reel.id == reel.id).values(likes_count=Reel.likes_count + 1)
    )
    await db.commit()
    return True, await _likes_count(db, reel_id)


async def unlike(db: AsyncSession, *, user: User, reel_id: uuid.UUID) -> tuple[bool, int]:
    reel = await get_reel(db, reel_id)

    result = await db.execute(
        delete(ReelLike).where(ReelLike.reel_id == reel.id, ReelLike.user_id == user.id)
    )
    if result.rowcount:
        await db.execute(
            update(Reel)
            .where(Reel.id == reel.id)
            .values(likes_count=func.greatest(Reel.likes_count - 1, 0))
        )
        await db.commit()
    else:
        await db.rollback()

    return False, await _likes_count(db, reel_id)


async def record_view(db: AsyncSession, *, reel_id: uuid.UUID) -> int:
    """Increment the view counter.

    Deliberately not deduplicated per user: that would need a row per viewer per
    reel, which is a lot of writes for a number shown as "820K". Explore ranking
    tolerates the imprecision.
    """
    await db.execute(
        update(Reel).where(Reel.id == reel_id).values(views_count=Reel.views_count + 1)
    )
    await db.commit()
    return await db.scalar(select(Reel.views_count).where(Reel.id == reel_id)) or 0


async def _likes_count(db: AsyncSession, reel_id: uuid.UUID) -> int:
    return await db.scalar(select(Reel.likes_count).where(Reel.id == reel_id)) or 0
