import asyncio
import contextlib
import json
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status

from app.core import security
from app.core.logging import get_logger
from app.db.session import SessionLocal
from app.models.user import User
from app.services import auth as auth_service
from app.services import presence
from app.services.realtime import manager

log = get_logger(__name__)
router = APIRouter()

# Presence keys expire on their own, so a socket has to say it is still there.
HEARTBEAT_SECONDS = 25
# A client that never speaks is not necessarily dead, but an unbounded idle socket
# is a resource leak, so require some traffic within this window.
IDLE_TIMEOUT_SECONDS = 120


async def _authenticate(token: str) -> User | None:
    """Resolve a user from an access token.

    WebSocket authentication is its own surface: the handshake carries no
    Authorization header from a browser, and an authenticated HTTP session grants
    nothing here. The token is validated exactly as the REST dependency does,
    including the logout denylist, so a signed-out token cannot open a socket.
    """
    payload = security.decode_access_token(token)
    if payload is None:
        return None

    if await auth_service.is_access_token_revoked(payload["jti"]):
        return None

    try:
        user_id = uuid.UUID(payload["sub"])
    except (ValueError, KeyError, TypeError):
        return None

    async with SessionLocal() as session:
        user = await session.get(User, user_id)
        if user is None or not user.is_active:
            return None
        # Detached copy: the session closes here, and the socket outlives it.
        session.expunge(user)
        return user


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = "") -> None:
    """Realtime events for the authenticated user.

    There is no subscribe message. What a socket receives is decided server-side
    from database membership, so a client cannot request a conversation at all,
    let alone one it does not belong to.

    The token arrives as a query parameter because browsers cannot set headers on a
    WebSocket handshake. Query strings can end up in proxy logs, so a short-lived
    single-use ticket endpoint would be the hardening step; the access token's
    15-minute lifetime bounds the exposure meanwhile.
    """
    user = await _authenticate(token) if token else None

    if user is None:
        # Rejected before accept, so an unauthenticated peer never reaches an open
        # socket.
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()
    await manager.connect(user.id, websocket)
    await presence.mark_online(user.id)

    heartbeat = asyncio.create_task(_heartbeat(user.id))

    try:
        await websocket.send_text(json.dumps({"type": "connected", "user_id": str(user.id)}))

        while True:
            try:
                raw = await asyncio.wait_for(websocket.receive_text(), timeout=IDLE_TIMEOUT_SECONDS)
            except TimeoutError:
                await websocket.close(code=status.WS_1001_GOING_AWAY)
                break

            await presence.mark_online(user.id)

            # The only thing a client may send is a ping. Anything else is ignored
            # rather than dispatched — there is no client-driven action here, so
            # there is no message surface to attack.
            try:
                event = json.loads(raw)
            except ValueError:
                continue

            if event.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))

    except WebSocketDisconnect:
        pass
    except Exception as exc:  # noqa: BLE001 - one bad socket must not take others down
        log.warning("ws_error", user=str(user.id), error=str(exc))
    finally:
        heartbeat.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await heartbeat

        await manager.disconnect(user.id, websocket)

        # Only the last socket for this user clears presence — someone on a phone
        # and a laptop should not appear offline when one of them closes.
        if manager.local_count(user.id) == 0:
            await presence.mark_offline(user.id)


async def _heartbeat(user_id: uuid.UUID) -> None:
    """Refresh presence while the socket is open.

    Presence is a TTL key rather than a flag so a crashed worker cannot leave
    someone permanently online; that means it has to be renewed.
    """
    while True:
        await asyncio.sleep(HEARTBEAT_SECONDS)
        await presence.mark_online(user_id)
