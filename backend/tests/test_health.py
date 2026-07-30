import pytest

from app.cache import redis as cache
from app.core.config import get_settings

PREFIX = get_settings().API_V1_PREFIX


async def test_health_reports_both_dependencies(client):
    resp = await client.get(f"{PREFIX}/health")

    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["database"] == "up"
    assert body["cache"] == "up"


async def test_health_degrades_when_cache_is_down(client, monkeypatch):
    """Losing Redis must degrade the app, not break it (PRD 6B)."""

    async def _cache_down() -> bool:
        return False

    monkeypatch.setattr(cache, "ping", _cache_down)

    resp = await client.get(f"{PREFIX}/health")

    assert resp.status_code == 200, "cache loss must not fail the request"
    body = resp.json()
    assert body["status"] == "degraded"
    assert body["database"] == "up"
    assert body["cache"] == "down"


async def test_health_is_down_when_database_is_unreachable(client, monkeypatch):
    from app.api.v1 import health as health_module

    async def _db_down() -> bool:
        return False

    monkeypatch.setattr(health_module, "_check_database", _db_down)

    resp = await client.get(f"{PREFIX}/health")

    assert resp.status_code == 503
    assert resp.json()["status"] == "down"


@pytest.mark.parametrize(
    "header,expected",
    [
        ("X-Content-Type-Options", "nosniff"),
        ("X-Frame-Options", "DENY"),
        ("Referrer-Policy", "no-referrer"),
    ],
)
async def test_security_headers_present(client, header, expected):
    resp = await client.get(f"{PREFIX}/health")
    assert resp.headers.get(header) == expected


async def test_request_id_is_echoed(client):
    resp = await client.get(f"{PREFIX}/health", headers={"X-Request-ID": "abc123"})
    assert resp.headers.get("X-Request-ID") == "abc123"


async def test_request_id_generated_when_absent(client):
    resp = await client.get(f"{PREFIX}/health")
    assert resp.headers.get("X-Request-ID")
