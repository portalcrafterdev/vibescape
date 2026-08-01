import json
import uuid
from typing import Annotated

from fastapi import APIRouter, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select

from app.cache import redis as cache
from app.core.deps import CurrentUser, DbSession
from app.core.logging import get_logger
from app.models.post import Post
from app.models.reel import Reel

log = get_logger(__name__)
router = APIRouter(tags=["explore"])

EXPLORE_CACHE_TTL = 120
EXPLORE_CACHE_KEY = "vibescape:explore:v1"


class ExploreItem(BaseModel):
    """Matches `SearchData.tsx` — id, image, views, isVideo.

    Note there is nothing viewer-specific here: no is_liked, no is_following. That
    is what makes the whole grid cacheable once for everyone rather than per user,
    unlike the feed.
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    image_url: str
    views: int = 0
    is_video: bool = False


class ExploreResponse(BaseModel):
    items: list[ExploreItem]


@router.get("/explore", response_model=ExploreResponse)
async def explore(
    db: DbSession,
    current_user: CurrentUser,
    limit: Annotated[int, Query(ge=1, le=60)] = 30,
) -> ExploreResponse:
    """The discovery grid: popular reels and recent posts.

    Cached under a single key with no viewer component. That is safe *because* the
    response carries no per-viewer state — the moment something like is_liked is
    added here, this key becomes a cross-user leak and must be scoped like the feed.
    """
    key = f"{EXPLORE_CACHE_KEY}:{limit}"

    hit = await cache.cache_get(key)
    if hit:
        try:
            return ExploreResponse.model_validate(json.loads(hit))
        except ValueError:
            log.warning("explore_cache_corrupt")

    # Reels first, ranked by views — the grid leads with what people watch.
    reels = (
        await db.scalars(
            select(Reel)
            .where(Reel.video_url.isnot(None) | Reel.media_asset_id.isnot(None))
            .order_by(Reel.views_count.desc(), Reel.created_at.desc())
            .limit(limit)
        )
    ).all()

    remaining = max(0, limit - len(reels))
    posts = (
        (
            await db.scalars(
                select(Post)
                .order_by(Post.likes_count.desc(), Post.created_at.desc())
                .limit(remaining)
            )
        ).all()
        if remaining
        else []
    )

    items = [
        ExploreItem(
            id=r.id, image_url=r.album_url or r.video_url or "", views=r.views_count, is_video=True
        )
        for r in reels
    ] + [
        ExploreItem(id=p.id, image_url=p.image_url or "", views=p.likes_count, is_video=False)
        for p in posts
    ]

    payload = ExploreResponse(items=items)
    await cache.cache_set(key, json.dumps(payload.model_dump(mode="json")), EXPLORE_CACHE_TTL)
    return payload
