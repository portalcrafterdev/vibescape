from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import get_settings
from app.main import app


@pytest.fixture
def settings():
    return get_settings()


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """HTTP client bound to the ASGI app, no network involved."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
