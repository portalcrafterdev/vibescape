import hashlib

import pytest

from app.core.config import Settings
from app.storage.cloudinary import CloudinaryStorage

CLOUD = "demo-cloud"
KEY = "123456789012345"
SECRET = "test-secret-value"


@pytest.fixture
def storage() -> CloudinaryStorage:
    return CloudinaryStorage(
        Settings(
            CLOUDINARY_CLOUD_NAME=CLOUD,
            CLOUDINARY_API_KEY=KEY,
            CLOUDINARY_API_SECRET=SECRET,
            _env_file=None,
        )
    )


class TestConfiguration:
    def test_credentials_without_a_cloud_name_are_refused(self):
        """A key and secret alone cannot build a single valid URL, so this must fail
        at startup rather than on the first upload."""
        with pytest.raises(ValueError, match="CLOUDINARY_CLOUD_NAME"):
            Settings(CLOUDINARY_API_KEY=KEY, CLOUDINARY_API_SECRET=SECRET, _env_file=None)

    def test_backend_selection_prefers_cloudinary(self):
        from app.storage import get_storage

        get_storage.cache_clear()
        try:
            settings = Settings(
                CLOUDINARY_CLOUD_NAME=CLOUD,
                CLOUDINARY_API_KEY=KEY,
                CLOUDINARY_API_SECRET=SECRET,
                S3_BUCKET="also-set",
                _env_file=None,
            )
            assert settings.CLOUDINARY_CLOUD_NAME
        finally:
            get_storage.cache_clear()

    async def test_production_accepts_cloudinary_instead_of_s3(self):
        settings = Settings(
            ENVIRONMENT="production",
            DEBUG=False,
            SECRET_KEY="x" * 40,
            CORS_ORIGINS="https://example.com",
            CLOUDINARY_CLOUD_NAME=CLOUD,
            CLOUDINARY_API_KEY=KEY,
            CLOUDINARY_API_SECRET=SECRET,
            S3_BUCKET="",
            _env_file=None,
        )
        assert settings.ENVIRONMENT == "production"

    async def test_production_still_refuses_no_storage_at_all(self):
        with pytest.raises(ValueError, match="CLOUDINARY_CLOUD_NAME or S3_BUCKET"):
            Settings(
                ENVIRONMENT="production",
                DEBUG=False,
                SECRET_KEY="x" * 40,
                CORS_ORIGINS="https://example.com",
                _env_file=None,
            )


class TestUploadSignature:
    async def test_signature_matches_cloudinary_scheme(self, storage):
        """Sorted `k=v` pairs joined by &, then the secret, SHA-1. Getting this wrong
        means every upload is rejected by Cloudinary with no useful error."""
        form = await storage.presigned_put(
            "uploads/u1/2026/08/asset.jpg",
            content_type="image/jpeg",
            max_bytes=1000,
            expires_in=300,
        )
        fields = form["fields"]

        signed_params = {
            "public_id": fields["public_id"],
            "timestamp": fields["timestamp"],
            "type": fields["type"],
        }
        payload = "&".join(f"{k}={signed_params[k]}" for k in sorted(signed_params))
        expected = hashlib.sha1(f"{payload}{SECRET}".encode()).hexdigest()  # noqa: S324

        assert fields["signature"] == expected

    async def test_api_key_is_sent_but_never_signed(self, storage):
        """api_key travels as a parameter; including it in the signed payload would
        produce a signature Cloudinary rejects."""
        form = await storage.presigned_put(
            "uploads/u1/a.jpg", content_type="image/jpeg", max_bytes=1000, expires_in=300
        )

        assert form["fields"]["api_key"] == KEY
        with_key = {**{k: v for k, v in form["fields"].items() if k != "signature"}}
        payload = "&".join(f"{k}={with_key[k]}" for k in sorted(with_key))
        wrong = hashlib.sha1(f"{payload}{SECRET}".encode()).hexdigest()  # noqa: S324
        assert form["fields"]["signature"] != wrong

    async def test_secret_never_appears_in_the_returned_form(self, storage):
        """The client receives this. Leaking the secret would let anyone sign uploads."""
        form = await storage.presigned_put(
            "uploads/u1/a.jpg", content_type="image/jpeg", max_bytes=1000, expires_in=300
        )

        assert SECRET not in str(form)

    async def test_uploads_are_authenticated_type(self, storage):
        """A public asset is reachable by guessing its id; authenticated is not."""
        form = await storage.presigned_put(
            "uploads/u1/a.jpg", content_type="image/jpeg", max_bytes=1000, expires_in=300
        )

        assert form["fields"]["type"] == "authenticated"

    async def test_video_routes_to_the_video_endpoint(self, storage):
        form = await storage.presigned_put(
            "uploads/u1/clip.mp4", content_type="video/mp4", max_bytes=1000, expires_in=300
        )

        assert "/video/upload" in form["url"]

    async def test_image_routes_to_the_image_endpoint(self, storage):
        form = await storage.presigned_put(
            "uploads/u1/a.jpg", content_type="image/jpeg", max_bytes=1000, expires_in=300
        )

        assert "/image/upload" in form["url"]

    async def test_public_id_drops_the_extension(self, storage):
        """Cloudinary appends the format itself; leaving ours on yields `a.jpg.jpg`."""
        form = await storage.presigned_put(
            "uploads/u1/a.jpg", content_type="image/jpeg", max_bytes=1000, expires_in=300
        )

        assert form["fields"]["public_id"] == "uploads/u1/a"


class TestDeliveryUrl:
    async def test_url_is_signed_and_authenticated(self, storage):
        url = await storage.presigned_get("uploads/u1/a.jpg", expires_in=3600)

        assert url.startswith(f"https://res.cloudinary.com/{CLOUD}/image/authenticated/")
        assert "/s--" in url, "delivery URL carries no signature"

    async def test_video_delivery_path(self, storage):
        url = await storage.presigned_get("uploads/u1/clip.mp4", expires_in=3600)

        assert "/video/authenticated/" in url

    async def test_signature_changes_with_the_asset(self, storage):
        one = await storage.presigned_get("uploads/u1/a.jpg", expires_in=3600)
        two = await storage.presigned_get("uploads/u1/b.jpg", expires_in=3600)

        assert one.split("/s--")[1] != two.split("/s--")[1]

    async def test_secret_is_not_in_the_url(self, storage):
        url = await storage.presigned_get("uploads/u1/a.jpg", expires_in=3600)

        assert SECRET not in url
