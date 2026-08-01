import uuid

from redis.exceptions import RedisError

from app.cache.redis import get_redis
from app.core.logging import get_logger

log = get_logger(__name__)

# Refreshed while a socket is open; expires on its own if the process dies without
# cleaning up. A boolean flag set on connect and cleared on disconnect would leave
# users permanently "online" after any crash.
PRESENCE_TTL_SECONDS = 60


def _key(user_id: uuid.UUID) -> str:
    return f"vibescape:presence:{user_id}"


async def mark_online(user_id: uuid.UUID) -> None:
    try:
        await get_redis().set(_key(user_id), "1", ex=PRESENCE_TTL_SECONDS)
    except (RedisError, OSError) as exc:
        log.warning("presence_write_failed", user=str(user_id), error=str(exc))


async def mark_offline(user_id: uuid.UUID) -> None:
    try:
        await get_redis().delete(_key(user_id))
    except (RedisError, OSError) as exc:
        log.warning("presence_delete_failed", user=str(user_id), error=str(exc))


async def is_online(user_id: uuid.UUID) -> bool:
    try:
        return await get_redis().exists(_key(user_id)) > 0
    except (RedisError, OSError):
        # Presence is decoration. Reporting everyone offline is a better failure
        # than refusing to render a conversation list.
        return False


async def online_set(user_ids: list[uuid.UUID]) -> set[uuid.UUID]:
    """Presence for a whole page in one round trip rather than one call per row."""
    if not user_ids:
        return set()
    try:
        redis = get_redis()
        pipe = redis.pipeline()
        for uid in user_ids:
            pipe.exists(_key(uid))
        results = await pipe.execute()
        return {uid for uid, present in zip(user_ids, results, strict=True) if present}
    except (RedisError, OSError):
        return set()
