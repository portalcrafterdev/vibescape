from fastapi import APIRouter

from app.api.v1 import (
    auth,
    comments,
    docs,
    explore,
    health,
    media,
    posts,
    reels,
    stories,
    users,
)
from app.core.config import get_settings

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(posts.router)
api_router.include_router(comments.router)
api_router.include_router(media.router)
api_router.include_router(reels.router)
api_router.include_router(stories.router)
api_router.include_router(explore.router)

if get_settings().ENABLE_DOCS:
    api_router.include_router(docs.router)

# Phase 2+ routers mount here: auth, users, posts, reels, stories, search, media, messages.
