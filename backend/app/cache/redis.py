from typing import Any

import redis.asyncio as aioredis
from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.core.config import get_settings
from app.core.logging import get_logger

log = get_logger(__name__)

_settings = get_settings()
_client: Redis | None = None


def get_redis() -> Redis:
    global _client
    if _client is None:
        _client = aioredis.from_url(
            _settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
            health_check_interval=30,
        )
    return _client


async def close_redis() -> None:
    global _client
    if _client is not None:
        await _client.aclose()
        _client = None


async def ping() -> bool:
    try:
        return bool(await get_redis().ping())
    except (RedisError, OSError):
        return False


async def cache_get(key: str) -> str | None:
    """Read through the cache. A Redis outage returns None, never raises.

    Callers treat None as a miss and fall through to the database, so losing Redis
    makes the app slow rather than broken (PRD 6B).
    """
    try:
        return await get_redis().get(key)
    except (RedisError, OSError) as exc:
        log.warning("cache_read_failed", key=key, error=str(exc))
        return None


async def cache_set(key: str, value: str, ttl_seconds: int) -> bool:
    """Write to the cache. Returns False on failure instead of raising."""
    try:
        await get_redis().set(key, value, ex=ttl_seconds)
        return True
    except (RedisError, OSError) as exc:
        log.warning("cache_write_failed", key=key, error=str(exc))
        return False


async def cache_delete(*keys: str) -> bool:
    """Invalidate keys. Returns False on failure instead of raising.

    A failure here means stale data survives its write, so callers that must not
    serve stale results should check the return value.
    """
    if not keys:
        return True
    try:
        await get_redis().delete(*keys)
        return True
    except (RedisError, OSError) as exc:
        log.warning("cache_delete_failed", keys=keys, error=str(exc))
        return False


def user_scoped_key(namespace: str, viewer_id: Any, *parts: Any) -> str:
    """Build a cache key for personalized data.

    The viewer id is mandatory and positional. Personalized responses cached without
    it get served across users — see PRD 6B. Use this rather than formatting keys by
    hand anywhere the response varies per viewer.
    """
    if viewer_id is None:
        raise ValueError("viewer_id is required for a personalized cache key")
    suffix = ":".join(str(p) for p in parts)
    base = f"vibescape:{namespace}:u{viewer_id}"
    return f"{base}:{suffix}" if suffix else base
