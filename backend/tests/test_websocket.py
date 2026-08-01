import json

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.core.config import get_settings
from app.main import app

settings = get_settings()
PREFIX = settings.API_V1_PREFIX

WS_URL = f"{PREFIX}/ws"


@pytest.fixture
def sync_client():
    """Starlette's TestClient — the only way to drive a WebSocket in tests.

    It runs its own event loop, while the rest of the suite shares a session-scoped
    one. The Redis client and the realtime pub/sub reader are module singletons
    bound to whichever loop created them, so both are reset around each socket test;
    otherwise a client built on the previous loop is reused here and every call
    fails with "attached to a different loop".
    """
    import app.cache.redis as redis_module
    from app.services import realtime

    def reset() -> None:
        # Dropped rather than closed: awaiting aclose() from a different loop is
        # itself the error being avoided. Tests are short-lived, so the orphaned
        # connection is collected with the loop.
        redis_module._client = None
        realtime.manager._pubsub = None
        realtime.manager._reader = None
        realtime.manager._local.clear()

    reset()
    with TestClient(app) as tc:
        yield tc
    reset()


def register(tc: TestClient) -> tuple[dict, str]:
    import uuid

    suffix = uuid.uuid4().hex[:10]
    body = tc.post(
        f"{PREFIX}/auth/register",
        json={
            "username": f"ws_{suffix}",
            "email": f"ws_{suffix}@example.com",
            "password": "correct horse battery staple",
        },
    ).json()
    return body["user"], body["tokens"]["access_token"]


class TestWebSocketAuth:
    def test_connect_without_a_token_is_refused(self, sync_client):
        """An authenticated HTTP session grants nothing here — the socket is its own
        surface and must present a token itself."""
        with pytest.raises(WebSocketDisconnect) as exc:
            with sync_client.websocket_connect(WS_URL) as ws:
                ws.receive_text()

        assert exc.value.code == 1008

    def test_garbage_token_is_refused(self, sync_client):
        with pytest.raises(WebSocketDisconnect) as exc:
            with sync_client.websocket_connect(f"{WS_URL}?token=not-a-jwt") as ws:
                ws.receive_text()

        assert exc.value.code == 1008

    def test_refresh_token_cannot_open_a_socket(self, sync_client):
        import uuid

        suffix = uuid.uuid4().hex[:10]
        body = sync_client.post(
            f"{PREFIX}/auth/register",
            json={
                "username": f"ws_{suffix}",
                "email": f"ws_{suffix}@example.com",
                "password": "correct horse battery staple",
            },
        ).json()
        refresh = body["tokens"]["refresh_token"]

        with pytest.raises(WebSocketDisconnect) as exc:
            with sync_client.websocket_connect(f"{WS_URL}?token={refresh}") as ws:
                ws.receive_text()

        assert exc.value.code == 1008

    def test_valid_token_connects(self, sync_client):
        _, token = register(sync_client)

        with sync_client.websocket_connect(f"{WS_URL}?token={token}") as ws:
            hello = json.loads(ws.receive_text())

        assert hello["type"] == "connected"

    def test_logged_out_token_cannot_open_a_socket(self, sync_client):
        """Logout denylists the access token. If the socket skipped that check, a
        signed-out client would keep receiving messages."""
        user, token = register(sync_client)
        headers = {"Authorization": f"Bearer {token}"}
        sync_client.post(f"{PREFIX}/auth/logout", headers=headers, json={})

        with pytest.raises(WebSocketDisconnect) as exc:
            with sync_client.websocket_connect(f"{WS_URL}?token={token}") as ws:
                ws.receive_text()

        assert exc.value.code == 1008


class TestRealtimeDelivery:
    def test_message_reaches_the_recipients_socket(self, sync_client):
        """Two parties, one socket open: the send must arrive without polling."""
        alice, alice_token = register(sync_client)
        bob, bob_token = register(sync_client)

        convo = sync_client.post(
            f"{PREFIX}/conversations",
            headers={"Authorization": f"Bearer {alice_token}"},
            json={"user_id": bob["id"]},
        ).json()

        with sync_client.websocket_connect(f"{WS_URL}?token={bob_token}") as bob_ws:
            assert json.loads(bob_ws.receive_text())["type"] == "connected"

            sync_client.post(
                f"{PREFIX}/conversations/{convo['id']}/messages",
                headers={"Authorization": f"Bearer {alice_token}"},
                json={"body": "live delivery"},
            )

            event = json.loads(bob_ws.receive_text())

        assert event["type"] == "message.created"
        assert event["message"]["body"] == "live delivery"
        assert event["conversation_id"] == convo["id"]

    def test_a_third_party_socket_receives_nothing(self, sync_client):
        """Delivery is addressed from database membership, so an outsider's socket
        is never a recipient. There is no subscribe message to abuse."""
        alice, alice_token = register(sync_client)
        bob, bob_token = register(sync_client)
        _, eve_token = register(sync_client)

        convo = sync_client.post(
            f"{PREFIX}/conversations",
            headers={"Authorization": f"Bearer {alice_token}"},
            json={"user_id": bob["id"]},
        ).json()

        with sync_client.websocket_connect(f"{WS_URL}?token={eve_token}") as eve_ws:
            assert json.loads(eve_ws.receive_text())["type"] == "connected"

            sync_client.post(
                f"{PREFIX}/conversations/{convo['id']}/messages",
                headers={"Authorization": f"Bearer {alice_token}"},
                json={"body": "not for eve"},
            )

            # A ping proves the socket is alive; if the message had leaked it would
            # arrive before the pong.
            eve_ws.send_text(json.dumps({"type": "ping"}))
            reply = json.loads(eve_ws.receive_text())

        assert reply["type"] == "pong", f"outsider received {reply}"

    def test_sender_also_receives_the_event(self, sync_client):
        """So a second device belonging to the sender stays in sync."""
        alice, alice_token = register(sync_client)
        bob, _ = register(sync_client)

        convo = sync_client.post(
            f"{PREFIX}/conversations",
            headers={"Authorization": f"Bearer {alice_token}"},
            json={"user_id": bob["id"]},
        ).json()

        with sync_client.websocket_connect(f"{WS_URL}?token={alice_token}") as alice_ws:
            alice_ws.receive_text()

            sync_client.post(
                f"{PREFIX}/conversations/{convo['id']}/messages",
                headers={"Authorization": f"Bearer {alice_token}"},
                json={"body": "echo"},
            )

            event = json.loads(alice_ws.receive_text())

        assert event["message"]["body"] == "echo"

    def test_ping_gets_a_pong(self, sync_client):
        _, token = register(sync_client)

        with sync_client.websocket_connect(f"{WS_URL}?token={token}") as ws:
            ws.receive_text()
            ws.send_text(json.dumps({"type": "ping"}))
            reply = json.loads(ws.receive_text())

        assert reply["type"] == "pong"

    def test_unknown_client_messages_are_ignored(self, sync_client):
        """There is no client-driven action, so an unrecognised frame must be
        dropped rather than dispatched."""
        _, token = register(sync_client)

        with sync_client.websocket_connect(f"{WS_URL}?token={token}") as ws:
            ws.receive_text()
            ws.send_text(json.dumps({"type": "subscribe", "conversation_id": "anything"}))
            ws.send_text("not even json")
            ws.send_text(json.dumps({"type": "ping"}))
            reply = json.loads(ws.receive_text())

        assert reply["type"] == "pong", "the socket did not survive junk input"


class TestPresence:
    def test_open_socket_marks_the_user_online(self, sync_client):
        alice, alice_token = register(sync_client)
        bob, bob_token = register(sync_client)

        sync_client.post(
            f"{PREFIX}/conversations",
            headers={"Authorization": f"Bearer {alice_token}"},
            json={"user_id": bob["id"]},
        )

        with sync_client.websocket_connect(f"{WS_URL}?token={bob_token}"):
            rows = sync_client.get(
                f"{PREFIX}/conversations", headers={"Authorization": f"Bearer {alice_token}"}
            ).json()
            online_while_connected = rows[0]["online"]

        assert online_while_connected is True

    def test_presence_clears_after_disconnect(self, sync_client):
        alice, alice_token = register(sync_client)
        bob, bob_token = register(sync_client)

        sync_client.post(
            f"{PREFIX}/conversations",
            headers={"Authorization": f"Bearer {alice_token}"},
            json={"user_id": bob["id"]},
        )

        with sync_client.websocket_connect(f"{WS_URL}?token={bob_token}"):
            pass

        rows = sync_client.get(
            f"{PREFIX}/conversations", headers={"Authorization": f"Bearer {alice_token}"}
        ).json()

        assert rows[0]["online"] is False
