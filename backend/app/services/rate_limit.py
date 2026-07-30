import time

from redis.exceptions import RedisError

from app.cache.redis import get_redis
from app.core.config import get_settings
from app.core.logging import get_logger

log = get_logger(__name__)
_settings = get_settings()


class RateLimitExceeded(Exception):
    def __init__(self, retry_after: int) -> None:
        super().__init__("Rate limit exceeded")
        self.retry_after = retry_after


async def check(bucket: str, identifier: str, *, limit: int, window_seconds: int) -> None:
    """Sliding-window rate limit. Raises RateLimitExceeded when over.

    Implemented as a Redis sorted set of request timestamps: drop everything older
    than the window, count what remains, add the current request. A fixed-window
    counter would allow a double-rate burst across a window boundary.

    Redis being unreachable does NOT block the request. That is a deliberate
    availability-over-enforcement choice for a cache-backed limiter; the account
    lockout in the auth service is the durable, database-backed protection and does
    not depend on Redis.
    """
    if not _settings.RATE_LIMIT_ENABLED:
        return

    key = f"vibescape:ratelimit:{bucket}:{identifier}"
    now = time.time()
    cutoff = now - window_seconds

    try:
        redis = get_redis()
        pipe = redis.pipeline()
        pipe.zremrangebyscore(key, 0, cutoff)
        pipe.zcard(key)
        pipe.zadd(key, {f"{now}:{id(pipe)}": now})
        pipe.expire(key, window_seconds + 1)
        results = await pipe.execute()
        count_before = results[1]
    except (RedisError, OSError) as exc:
        log.warning("rate_limit_unavailable", bucket=bucket, error=str(exc))
        return

    if count_before >= limit:
        raise RateLimitExceeded(retry_after=window_seconds)


async def check_auth_endpoint(ip: str) -> None:
    await check(
        "auth",
        ip,
        limit=_settings.RATE_LIMIT_AUTH_PER_IP,
        window_seconds=_settings.RATE_LIMIT_AUTH_WINDOW_SECONDS,
    )


async def reset(bucket: str, identifier: str) -> None:
    """Clear a bucket. Used by tests and after a successful login."""
    try:
        await get_redis().delete(f"vibescape:ratelimit:{bucket}:{identifier}")
    except (RedisError, OSError):
        pass
