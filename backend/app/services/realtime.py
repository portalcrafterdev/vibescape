import asyncio
import json
import uuid
from collections import defaultdict

from fastapi import WebSocket
from redis.exceptions import RedisError

from app.cache.redis import get_redis
from app.core.logging import get_logger

log = get_logger(__name__)


def user_channel(user_id: uuid.UUID) -> str:
    return f"vibescape:ws:user:{user_id}"


class ConnectionManager:
    """Routes realtime events to the right sockets.

    Delivery is addressed per user, never per conversation, and the set of users a
    message goes to is computed from database membership at publish time. There is
    no client-side subscribe: a socket cannot ask for a conversation, so it cannot
    ask for one it is not in. That removes the whole class of "authenticated but
    not authorised to watch this thread" bugs rather than guarding against them.

    Redis pub/sub carries events between workers — with more than one uvicorn
    process, a socket on worker B must still receive a message written on worker A.
    """

    def __init__(self) -> None:
        self._local: dict[uuid.UUID, set[WebSocket]] = defaultdict(set)
        self._pubsub = None
        self._reader: asyncio.Task | None = None
        self._lock = asyncio.Lock()

    # ------------------------------------------------------------ lifecycle

    async def connect(self, user_id: uuid.UUID, websocket: WebSocket) -> None:
        async with self._lock:
            first_for_user = not self._local[user_id]
            self._local[user_id].add(websocket)

            if first_for_user:
                await self._subscribe(user_id)

    async def disconnect(self, user_id: uuid.UUID, websocket: WebSocket) -> None:
        async with self._lock:
            self._local[user_id].discard(websocket)
            if not self._local[user_id]:
                del self._local[user_id]
                await self._unsubscribe(user_id)

    def local_count(self, user_id: uuid.UUID) -> int:
        return len(self._local.get(user_id, ()))

    # ------------------------------------------------------------ redis fanout

    async def _ensure_pubsub(self):
        if self._pubsub is None:
            self._pubsub = get_redis().pubsub(ignore_subscribe_messages=True)
            self._reader = asyncio.create_task(self._read_loop())
        return self._pubsub

    async def _subscribe(self, user_id: uuid.UUID) -> None:
        try:
            pubsub = await self._ensure_pubsub()
            await pubsub.subscribe(user_channel(user_id))
        except (RedisError, OSError) as exc:
            # Without Redis, delivery still works within this process. Losing
            # cross-worker fanout is a degradation, not a reason to refuse a socket.
            log.warning("ws_subscribe_failed", user=str(user_id), error=str(exc))

    async def _unsubscribe(self, user_id: uuid.UUID) -> None:
        try:
            if self._pubsub is not None:
                await self._pubsub.unsubscribe(user_channel(user_id))
        except (RedisError, OSError):
            pass

    async def _read_loop(self) -> None:
        """Forward messages from Redis to this worker's sockets."""
        try:
            async for raw in self._pubsub.listen():
                if raw is None or raw.get("type") != "message":
                    continue
                channel = raw["channel"]
                if isinstance(channel, bytes):
                    channel = channel.decode()
                try:
                    user_id = uuid.UUID(channel.rsplit(":", 1)[1])
                except (ValueError, IndexError):
                    continue
                await self._deliver_local(user_id, raw["data"])
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # noqa: BLE001 - the loop must survive one bad event
            log.warning("ws_read_loop_stopped", error=str(exc))

    async def _deliver_local(self, user_id: uuid.UUID, payload) -> None:
        if isinstance(payload, bytes):
            payload = payload.decode()

        dead: list[WebSocket] = []
        for socket in tuple(self._local.get(user_id, ())):
            try:
                await socket.send_text(payload)
            except Exception:  # noqa: BLE001 - a closed socket must not stop the rest
                dead.append(socket)

        for socket in dead:
            self._local.get(user_id, set()).discard(socket)

    # ------------------------------------------------------------ publishing

    async def publish(self, user_ids: list[uuid.UUID], event: dict) -> None:
        """Send an event to every listed user, wherever they are connected."""
        payload = json.dumps(event, default=str)

        for user_id in user_ids:
            try:
                await get_redis().publish(user_channel(user_id), payload)
            except (RedisError, OSError) as exc:
                log.warning("ws_publish_failed", user=str(user_id), error=str(exc))
                # Fall back to this process so a Redis outage does not silently
                # drop messages for locally connected sockets.
                await self._deliver_local(user_id, payload)

    async def shutdown(self) -> None:
        if self._reader is not None:
            self._reader.cancel()
            try:
                await self._reader
            except asyncio.CancelledError:
                pass
            self._reader = None
        if self._pubsub is not None:
            try:
                await self._pubsub.aclose()
            except Exception as exc:  # noqa: BLE001
                # Shutdown path — a failure to close cleanly must not mask the
                # reason the process is stopping.
                log.debug("ws_pubsub_close_failed", error=str(exc))
            self._pubsub = None


manager = ConnectionManager()
