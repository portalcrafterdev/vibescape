"""Production configuration guards.

Every check here is something that is harmless locally and serious once deployed.
Settings validation is the last place to catch them, because a misconfigured
deploy that boots is far worse than one that refuses to.
"""

import pytest

from app.core.config import Settings

BASE = {
    "ENVIRONMENT": "production",
    "DEBUG": False,
    "SECRET_KEY": "x" * 64,
    "CORS_ORIGINS": "https://app.vibescape.test",
    "S3_BUCKET": "vibescape-media",
    "_env_file": None,
}


def prod(**overrides) -> Settings:
    return Settings(**{**BASE, **overrides})


class TestProductionRefusesUnsafeConfig:
    def test_a_correct_production_config_boots(self):
        settings = prod()
        assert settings.ENVIRONMENT == "production"
        assert settings.ENABLE_DOCS is False, "docs default to on in production"

    def test_missing_secret_key_is_refused(self):
        with pytest.raises(ValueError, match="SECRET_KEY"):
            prod(SECRET_KEY="")

    def test_debug_is_refused(self):
        """Debug turns on the interactive docs and verbose logging."""
        with pytest.raises(ValueError, match="DEBUG"):
            prod(DEBUG=True)

    def test_wildcard_cors_is_refused(self):
        """A wildcard origin alongside credentials lets any site call the API as
        a logged-in user."""
        with pytest.raises(ValueError, match="CORS_ORIGINS"):
            prod(CORS_ORIGINS="*")

    def test_no_media_storage_is_refused(self):
        with pytest.raises(ValueError, match="CLOUDINARY_CLOUD_NAME or S3_BUCKET"):
            prod(S3_BUCKET="")

    def test_sync_database_driver_is_refused(self):
        """A sync driver blocks the event loop under load rather than failing."""
        with pytest.raises(ValueError, match="asyncpg"):
            prod(DATABASE_URL="postgresql://user@host/db")

    def test_cloudinary_credentials_without_a_cloud_name_are_refused(self):
        with pytest.raises(ValueError, match="CLOUDINARY_CLOUD_NAME"):
            prod(CLOUDINARY_API_KEY="k", CLOUDINARY_API_SECRET="s", CLOUDINARY_CLOUD_NAME="")


class TestProductionDefaults:
    def test_docs_are_off_unless_explicitly_enabled(self):
        assert prod().ENABLE_DOCS is False
        assert prod(ENABLE_DOCS=True).ENABLE_DOCS is True

    def test_rate_limiting_is_on_by_default(self):
        assert prod().RATE_LIMIT_ENABLED is True

    def test_access_tokens_are_short_lived(self):
        """The window during which a stolen access token is useful."""
        assert prod().ACCESS_TOKEN_EXPIRE_MINUTES <= 30

    def test_a_generated_dev_secret_never_reaches_production(self):
        """Development mints an ephemeral key when none is set. That fallback must
        not exist in production, or every deploy would silently rotate it and sign
        everyone out."""
        dev = Settings(ENVIRONMENT="development", SECRET_KEY="", _env_file=None)
        assert dev.SECRET_KEY, "development should generate a key"

        with pytest.raises(ValueError):
            prod(SECRET_KEY="")


class TestSecurityHeaders:
    async def test_hsts_present_outside_development(self, client):
        resp = await client.get("/api/v1/health")
        # The test environment is staging, so HSTS applies.
        assert "strict-transport-security" in {k.lower() for k in resp.headers}

    async def test_api_responses_carry_the_strict_csp(self, client):
        resp = await client.get("/api/v1/health")

        assert resp.headers["content-security-policy"] == (
            "default-src 'none'; frame-ancestors 'none'"
        )

    async def test_no_server_version_disclosure(self, client):
        """Advertising the exact server build hands over a version to match
        against known advisories."""
        resp = await client.get("/api/v1/health")

        server = resp.headers.get("server", "")
        assert "/" not in server, f"server header discloses a version: {server}"
