import uuid
from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete

from app.cache.redis import get_redis
from app.core.config import get_settings
from app.db.session import SessionLocal
from app.main import app
from app.models.comment import Comment
from app.models.follow import Follow
from app.models.hashtag import Hashtag, PostHashtag
from app.models.media import MediaAsset
from app.models.mention import Mention
from app.models.message import Conversation, ConversationParticipant, Message
from app.models.post import Post, PostLike
from app.models.reel import Reel, ReelLike
from app.models.story import Highlight, HighlightItem, Story
from app.models.tag import PostTag
from app.models.token import PasswordResetToken, RefreshToken
from app.models.user import User

PREFIX = get_settings().API_V1_PREFIX

# Pin media storage to the local backend for the whole suite.
#
# Otherwise which tests pass depends on whatever .env happens to select: point the
# app at Cloudinary and every upload test starts failing, because it was exercising
# the flow through the local stand-in. A test suite whose result changes with
# deployment configuration is not telling you anything about the code. The
# provider-specific behaviour is covered separately in test_storage_cloudinary.py,
# which constructs its backend directly.
get_settings().MEDIA_BACKEND = "local"

from app.storage import get_storage  # noqa: E402

get_storage.cache_clear()


@pytest.fixture
def settings():
    return get_settings()


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """HTTP client bound to the ASGI app, no network involved."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def client_passthrough() -> AsyncGenerator[AsyncClient, None]:
    """Client that returns the 500 response instead of re-raising.

    By default httpx re-raises an unhandled exception, which is useful for
    debugging but makes it impossible to assert on what the client would actually
    have received. Auditing the error envelope requires seeing the real response.
    """
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture(autouse=True)
async def clean_state() -> AsyncGenerator[None, None]:
    """Remove rows and rate-limit keys this test created.

    Scoped deliberately to our own key prefix — Redis here is shared with other
    projects on the machine, so a FLUSHDB would destroy their data.
    """
    yield

    async with SessionLocal() as session:
        await session.execute(delete(Message))
        await session.execute(delete(ConversationParticipant))
        await session.execute(delete(Conversation))
        await session.execute(delete(HighlightItem))
        await session.execute(delete(Highlight))
        await session.execute(delete(Story))
        await session.execute(delete(ReelLike))
        await session.execute(delete(Reel))
        await session.execute(delete(Mention))
        await session.execute(delete(Comment))
        await session.execute(delete(PostLike))
        await session.execute(delete(PostTag))
        await session.execute(delete(PostHashtag))
        # Hashtags outlive the posts that used them — nothing cascades them away, so
        # without this a tag written by one test would still be there, with a stale
        # posts_count, for the next one that searches.
        await session.execute(delete(Hashtag))
        await session.execute(delete(Post))
        await session.execute(delete(MediaAsset))
        await session.execute(delete(Follow))
        await session.execute(delete(PasswordResetToken))
        await session.execute(delete(RefreshToken))
        await session.execute(delete(User))
        await session.commit()

    try:
        redis = get_redis()
        for pattern in (
            "vibescape:ratelimit:*",
            "vibescape:denylist:*",
            "vibescape:profile:*",
            "vibescape:feed:*",
            "vibescape:explore:*",
            "vibescape:presence:*",
        ):
            keys = [key async for key in redis.scan_iter(match=pattern, count=500)]
            if keys:
                await redis.delete(*keys)
    except Exception:  # noqa: BLE001 - cleanup must never fail a test run
        pass


@pytest.fixture
def credentials() -> dict[str, str]:
    """Unique per call so parallel or repeated runs never collide."""
    suffix = uuid.uuid4().hex[:10]
    return {
        "username": f"user_{suffix}",
        # example.com, not .test — the latter is a reserved TLD that email-validator
        # rejects outright, which would be testing the validator rather than the API.
        "email": f"user_{suffix}@example.com",
        "password": "correct horse battery staple",
    }


@pytest.fixture
async def registered(client: AsyncClient, credentials: dict[str, str]) -> dict:
    """A registered, signed-in account. Returns the full auth payload plus credentials."""
    resp = await client.post(f"{PREFIX}/auth/register", json=credentials)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    return {
        "credentials": credentials,
        "user": body["user"],
        "access_token": body["tokens"]["access_token"],
        "refresh_token": body["tokens"]["refresh_token"],
    }


@pytest.fixture
def auth_headers(registered: dict) -> dict[str, str]:
    return {"Authorization": f"Bearer {registered['access_token']}"}


@pytest.fixture
async def make_user(client: AsyncClient):
    """Create additional accounts. Returns (payload, headers)."""

    async def _make() -> tuple[dict, dict[str, str]]:
        suffix = uuid.uuid4().hex[:10]
        creds = {
            "username": f"user_{suffix}",
            "email": f"user_{suffix}@example.com",
            "password": "correct horse battery staple",
        }
        resp = await client.post(f"{PREFIX}/auth/register", json=creds)
        assert resp.status_code == 201, resp.text
        body = resp.json()
        return body, {"Authorization": f"Bearer {body['tokens']['access_token']}"}

    return _make


@pytest.fixture
async def other_user(make_user) -> tuple[dict, dict[str, str]]:
    """A second account, for follow and authorisation tests."""
    return await make_user()


@pytest.fixture
def expose_reset_token(monkeypatch):
    """Turn on the development-only reset-token header for this test.

    Without a mail provider it is the only way to obtain the raw token, but the
    header is gated on ENVIRONMENT — which is a deployment setting, not something
    the suite should depend on. Opting in explicitly keeps these tests passing
    whatever the local .env says.
    """
    monkeypatch.setattr(get_settings(), "ENVIRONMENT", "development")
