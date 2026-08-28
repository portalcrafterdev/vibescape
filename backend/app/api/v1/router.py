from fastapi import APIRouter

from app.api.v1 import docs, health
from app.core.config import get_settings

api_router = APIRouter()
api_router.include_router(health.router)

if get_settings().ENABLE_DOCS:
    api_router.include_router(docs.router)

# Phase 2+ routers mount here: auth, users, posts, reels, stories, search, media, messages.
