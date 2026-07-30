import pytest

from app.cache.redis import user_scoped_key
from app.core.config import Settings, get_settings

PREFIX = get_settings().API_V1_PREFIX


class TestCacheKeys:
    def test_viewer_id_is_required(self):
        """A personalized key without a viewer id leaks across users (PRD 6B)."""
        with pytest.raises(ValueError, match="viewer_id is required"):
            user_scoped_key("feed", None)

    def test_different_viewers_get_different_keys(self):
        assert user_scoped_key("feed", 1, "page", 2) != user_scoped_key("feed", 2, "page", 2)

    def test_key_is_stable_for_same_inputs(self):
        assert user_scoped_key("feed", 7, "page", 1) == user_scoped_key("feed", 7, "page", 1)


class TestSettingsValidation:
    def test_rejects_sync_database_driver(self):
        with pytest.raises(ValueError, match="asyncpg"):
            Settings(
                DATABASE_URL="postgresql://u@localhost/db",
                _env_file=None,
            )

    def test_parses_comma_separated_cors_origins(self):
        s = Settings(
            CORS_ORIGINS="http://a.test, http://b.test",
            _env_file=None,
        )
        assert s.CORS_ORIGINS == ["http://a.test", "http://b.test"]

    def test_production_requires_secret_key(self):
        with pytest.raises(ValueError, match="SECRET_KEY"):
            Settings(ENVIRONMENT="production", DEBUG=False, SECRET_KEY="", _env_file=None)

    def test_production_rejects_debug(self):
        with pytest.raises(ValueError, match="DEBUG"):
            Settings(ENVIRONMENT="production", DEBUG=True, SECRET_KEY="x" * 40, _env_file=None)

    def test_production_rejects_wildcard_cors(self):
        with pytest.raises(ValueError, match="CORS_ORIGINS"):
            Settings(
                ENVIRONMENT="production",
                DEBUG=False,
                SECRET_KEY="x" * 40,
                CORS_ORIGINS="*",
                _env_file=None,
            )

    def test_dev_generates_ephemeral_secret(self):
        s = Settings(ENVIRONMENT="development", SECRET_KEY="", _env_file=None)
        assert len(s.SECRET_KEY) >= 40

    def test_blank_enable_docs_falls_back_to_debug(self):
        """A commented-out or empty value in .env must not crash startup."""
        assert Settings(ENABLE_DOCS="", DEBUG=True, _env_file=None).ENABLE_DOCS is True
        assert Settings(ENABLE_DOCS="", DEBUG=False, _env_file=None).ENABLE_DOCS is False

    def test_enable_docs_overrides_debug(self):
        s = Settings(ENABLE_DOCS=True, DEBUG=False, _env_file=None)
        assert s.ENABLE_DOCS is True


class TestErrorEnvelope:
    async def test_unknown_route_returns_envelope(self, client):
        resp = await client.get(f"{PREFIX}/definitely-not-a-route")

        assert resp.status_code == 404
        body = resp.json()
        assert "error" in body
        assert body["error"]["code"] == "http_error"

    async def test_oversized_body_rejected(self, client, settings):
        oversized = str(settings.MAX_REQUEST_BODY_BYTES + 1)
        resp = await client.post(
            f"{PREFIX}/health",
            content=b"x",
            headers={"Content-Length": oversized},
        )

        assert resp.status_code == 413
        assert resp.json()["error"]["code"] == "payload_too_large"
