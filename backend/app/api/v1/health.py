from typing import Literal

from fastapi import APIRouter, Response, status
from pydantic import BaseModel
from sqlalchemy import text

from app.cache import redis as cache
from app.core.logging import get_logger
from app.db.session import SessionLocal

log = get_logger(__name__)
router = APIRouter(tags=["health"])

ComponentStatus = Literal["up", "down"]


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded", "down"]
    database: ComponentStatus
    cache: ComponentStatus


async def _check_database() -> bool:
    try:
        async with SessionLocal() as session:
            await session.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        log.warning("health_database_down", error=str(exc))
        return False


@router.get("/health", response_model=HealthResponse)
async def health(response: Response) -> HealthResponse:
    """Liveness and dependency check.

    The database is required, so losing it is "down" and returns 503. Redis is a cache,
    so losing it is "degraded" and still returns 200 — the app serves from Postgres.
    """
    db_up = await _check_database()
    cache_up = await cache.ping()

    if not db_up:
        overall: Literal["ok", "degraded", "down"] = "down"
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    elif not cache_up:
        overall = "degraded"
    else:
        overall = "ok"

    return HealthResponse(
        status=overall,
        database="up" if db_up else "down",
        cache="up" if cache_up else "down",
    )
