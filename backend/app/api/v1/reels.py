import uuid
from typing import Annotated

from fastapi import APIRouter, Query, status

from app.core.deps import CurrentUser, DbSession
from app.models.reel import Reel
from app.models.user import User
from app.schemas.post import PostAuthor
from app.schemas.reel import (
    CreateReelRequest,
    PaginatedReels,
    ReelLikeResponse,
    ReelOut,
)
from app.services import media as media_service
from app.services import reels as service

router = APIRouter(prefix="/reels", tags=["reels"])


def _to_out(reel: Reel, author: User, *, viewer_id: uuid.UUID, liked: bool, video: str) -> ReelOut:
    return ReelOut(
        id=reel.id,
        author=PostAuthor.model_validate(author),
        video_url=video,
        album_url=reel.album_url,
        caption=reel.caption,
        likes_count=reel.likes_count,
        comments_count=reel.comments_count,
        views_count=reel.views_count,
        created_at=reel.created_at,
        is_liked=liked,
        is_mine=reel.author_id == viewer_id,
    )


async def _video_urls(db, reels: list[Reel]) -> dict[uuid.UUID, str]:
    """Signed URLs for uploaded reels, resolved at read time."""
    from app.models.media import MediaAsset

    asset_ids = [r.media_asset_id for r in reels if r.media_asset_id]
    if not asset_ids:
        return {}

    rows = await db.scalars(select_assets(MediaAsset, asset_ids))
    by_id = {a.id: a for a in rows.all()}

    out: dict[uuid.UUID, str] = {}
    for reel in reels:
        asset = by_id.get(reel.media_asset_id) if reel.media_asset_id else None
        if asset is not None:
            out[reel.id] = await media_service.signed_url(asset)
    return out


def select_assets(model, ids):
    from sqlalchemy import select

    return select(model).where(model.id.in_(ids))


@router.get("", response_model=PaginatedReels)
async def list_reels(
    db: DbSession,
    current_user: CurrentUser,
    cursor: str | None = None,
    limit: Annotated[int, Query(ge=1, le=service.MAX_PAGE_SIZE)] = service.DEFAULT_PAGE_SIZE,
) -> PaginatedReels:
    """The reels feed, newest first.

    Not restricted to accounts you follow — a reels tab limited to your graph would
    be empty for a new account, which defeats its purpose.
    """
    rows, next_cursor, has_more = await service.list_reels(db, cursor=cursor, limit=limit)
    liked = await service.liked_set(db, current_user.id, [r.id for r, _ in rows])
    signed = await _video_urls(db, [r for r, _ in rows])

    return PaginatedReels(
        items=[
            _to_out(
                reel,
                author,
                viewer_id=current_user.id,
                liked=reel.id in liked,
                video=signed.get(reel.id) or reel.video_url or "",
            )
            for reel, author in rows
        ],
        next_cursor=next_cursor,
        has_more=has_more,
    )


@router.post("", response_model=ReelOut, status_code=status.HTTP_201_CREATED)
async def create_reel(
    payload: CreateReelRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> ReelOut:
    asset = None
    if payload.media_asset_id:
        asset = await media_service.get_ready_asset(
            db, owner=current_user, asset_id=payload.media_asset_id
        )

    reel = await service.create_reel(
        db,
        author=current_user,
        video_url=payload.video_url,
        album_url=payload.album_url,
        caption=payload.caption,
        media_asset_id=asset.id if asset else None,
    )
    video = await media_service.signed_url(asset) if asset else (payload.video_url or "")
    return _to_out(reel, current_user, viewer_id=current_user.id, liked=False, video=video)


@router.delete("/{reel_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reel(reel_id: uuid.UUID, db: DbSession, current_user: CurrentUser) -> None:
    """Delete your own reel. Someone else's returns 403."""
    await service.delete_reel(db, actor=current_user, reel_id=reel_id)


@router.post("/{reel_id}/like", response_model=ReelLikeResponse)
async def like_reel(
    reel_id: uuid.UUID, db: DbSession, current_user: CurrentUser
) -> ReelLikeResponse:
    liked, count = await service.like(db, user=current_user, reel_id=reel_id)
    return ReelLikeResponse(liked=liked, likes_count=count)


@router.delete("/{reel_id}/like", response_model=ReelLikeResponse)
async def unlike_reel(
    reel_id: uuid.UUID, db: DbSession, current_user: CurrentUser
) -> ReelLikeResponse:
    liked, count = await service.unlike(db, user=current_user, reel_id=reel_id)
    return ReelLikeResponse(liked=liked, likes_count=count)


@router.post("/{reel_id}/view", response_model=dict)
async def record_view(reel_id: uuid.UUID, db: DbSession, current_user: CurrentUser) -> dict:
    """Count a view.

    Not deduplicated per user — that needs a row per viewer per reel, a lot of
    writes for a number displayed as "820K". Explore ranking tolerates the drift.
    """
    await service.get_reel(db, reel_id)
    views = await service.record_view(db, reel_id=reel_id)
    return {"views_count": views}
