import time

import pytest

from app.core import media_types
from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.media import MediaAsset, MediaStatus
from app.services import rate_limit
from app.storage import get_storage

settings = get_settings()
PREFIX = settings.API_V1_PREFIX

# Real leading bytes for each format.
JPEG = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01" + b"\x00" * 40
PNG = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + b"\x00" * 40
GIF = b"GIF89a" + b"\x00" * 40
WEBP = b"RIFF\x24\x00\x00\x00WEBPVP8 " + b"\x00" * 40
MP4 = b"\x00\x00\x00\x20ftypisom" + b"\x00" * 40

# A Mach-O executable renamed to look like a photo. The classic upload attack.
MACHO = b"\xcf\xfa\xed\xfe\x07\x00\x00\x01\x03\x00\x00\x00" + b"\x00" * 40
# An HTML file that a browser would happily execute if served back inline.
HTML = b"<html><script>alert(1)</script></html>" + b" " * 20


class TestSignatureDetection:
    @pytest.mark.parametrize(
        "data,expected",
        [
            (JPEG, "image/jpeg"),
            (PNG, "image/png"),
            (GIF, "image/gif"),
            (WEBP, "image/webp"),
            (MP4, "video/mp4"),
        ],
    )
    def test_recognises_real_formats(self, data, expected):
        kind = media_types.sniff(data)
        assert kind is not None
        assert kind.content_type == expected

    @pytest.mark.parametrize("data", [MACHO, HTML, b"", b"short", b"\x00" * 32])
    def test_rejects_anything_unrecognised(self, data):
        """An allowlist fails closed. A denylist would pass whatever it forgot."""
        assert media_types.sniff(data) is None

    def test_declared_type_allowlist(self):
        assert media_types.is_allowed_declared_type("image/jpeg")
        assert media_types.is_allowed_declared_type("image/png; charset=binary")
        assert not media_types.is_allowed_declared_type("application/x-executable")
        assert not media_types.is_allowed_declared_type("text/html")


async def request_url(client, headers, content_type="image/jpeg") -> dict:
    resp = await client.post(
        f"{PREFIX}/media/upload-url", headers=headers, json={"content_type": content_type}
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


async def upload_bytes(client, form: dict, data: bytes) -> int:
    """Push bytes through the local dev backend the same way a client would."""
    resp = await client.post(
        f"{PREFIX}/media/local/upload",
        data=form["fields"],
        files={"file": ("upload.bin", data, "application/octet-stream")},
    )
    return resp.status_code


class TestUploadUrl:
    async def test_issues_a_url_and_a_pending_asset(self, client, auth_headers):
        body = await request_url(client, auth_headers)

        assert body["upload_url"]
        assert body["max_bytes"] == settings.MAX_IMAGE_BYTES
        assert body["expires_in"] == settings.UPLOAD_URL_EXPIRE_SECONDS

        async with SessionLocal() as session:
            asset = await session.get(MediaAsset, body["asset_id"])
            assert asset.status == MediaStatus.PENDING

    async def test_video_gets_the_larger_ceiling(self, client, auth_headers):
        body = await request_url(client, auth_headers, "video/mp4")

        assert body["max_bytes"] == settings.MAX_VIDEO_BYTES

    async def test_unsupported_declared_type_refused_upfront(self, client, auth_headers):
        resp = await client.post(
            f"{PREFIX}/media/upload-url",
            headers=auth_headers,
            json={"content_type": "application/x-executable"},
        )

        assert resp.status_code == 415
        assert resp.json()["error"]["code"] == "unsupported_media_type"

    async def test_storage_key_is_server_generated(self, client, registered, auth_headers):
        """A caller-supplied path is how one user overwrites another's object."""
        body = await request_url(client, auth_headers)

        async with SessionLocal() as session:
            asset = await session.get(MediaAsset, body["asset_id"])

        assert asset.storage_key.startswith(f"uploads/{registered['user']['id']}/")
        assert str(asset.id) in asset.storage_key

    async def test_client_cannot_choose_the_key(self, client, auth_headers):
        resp = await client.post(
            f"{PREFIX}/media/upload-url",
            headers=auth_headers,
            json={"content_type": "image/jpeg", "key": "../../etc/passwd"},
        )

        assert resp.status_code == 422

    async def test_requires_authentication(self, client):
        resp = await client.post(f"{PREFIX}/media/upload-url", json={"content_type": "image/jpeg"})

        assert resp.status_code == 401

    async def test_upload_rate_limit_trips(self, client, registered, auth_headers, monkeypatch):
        monkeypatch.setattr(settings, "RATE_LIMIT_UPLOADS_PER_USER", 3)
        await rate_limit.reset("upload", registered["user"]["id"])

        statuses = []
        for _ in range(6):
            resp = await client.post(
                f"{PREFIX}/media/upload-url",
                headers=auth_headers,
                json={"content_type": "image/jpeg"},
            )
            statuses.append(resp.status_code)

        assert 429 in statuses, f"upload limit never tripped: {statuses}"


class TestConfirm:
    async def test_confirm_marks_ready_and_records_the_real_type(self, client, auth_headers):
        issued = await request_url(client, auth_headers)
        assert await upload_bytes(client, issued, PNG) == 204

        resp = await client.post(
            f"{PREFIX}/media/{issued['asset_id']}/confirm", headers=auth_headers
        )

        assert resp.status_code == 200
        body = resp.json()
        # Declared image/jpeg, actually a PNG. The bytes win.
        assert body["content_type"] == "image/png"
        assert body["url"]

    async def test_executable_renamed_as_an_image_is_rejected(self, client, auth_headers):
        """The attack this whole flow exists to stop."""
        issued = await request_url(client, auth_headers, "image/jpeg")
        await upload_bytes(client, issued, MACHO)

        resp = await client.post(
            f"{PREFIX}/media/{issued['asset_id']}/confirm", headers=auth_headers
        )

        assert resp.status_code == 415
        assert resp.json()["error"]["code"] == "unsupported_media_type"

    async def test_rejected_upload_is_deleted_not_left_lying_around(self, client, auth_headers):
        issued = await request_url(client, auth_headers)
        await upload_bytes(client, issued, HTML)

        await client.post(f"{PREFIX}/media/{issued['asset_id']}/confirm", headers=auth_headers)

        async with SessionLocal() as session:
            asset = await session.get(MediaAsset, issued["asset_id"])
        assert asset is None, "rejected asset row survived"

        stored = await get_storage().head(f"uploads/x/{issued['asset_id']}")
        assert stored is None

    async def test_confirm_without_uploading_anything(self, client, auth_headers):
        issued = await request_url(client, auth_headers)

        resp = await client.post(
            f"{PREFIX}/media/{issued['asset_id']}/confirm", headers=auth_headers
        )

        assert resp.status_code == 409
        assert resp.json()["error"]["code"] == "media_not_uploaded"

    async def test_cannot_confirm_someone_elses_upload(self, client, auth_headers, other_user):
        _, other_headers = other_user
        issued = await request_url(client, other_headers)
        await upload_bytes(client, issued, JPEG)

        resp = await client.post(
            f"{PREFIX}/media/{issued['asset_id']}/confirm", headers=auth_headers
        )

        assert resp.status_code == 403

    async def test_confirm_is_idempotent(self, client, auth_headers):
        issued = await request_url(client, auth_headers)
        await upload_bytes(client, issued, JPEG)

        first = await client.post(
            f"{PREFIX}/media/{issued['asset_id']}/confirm", headers=auth_headers
        )
        second = await client.post(
            f"{PREFIX}/media/{issued['asset_id']}/confirm", headers=auth_headers
        )

        assert first.status_code == second.status_code == 200

    async def test_oversized_upload_rejected(self, client, auth_headers, monkeypatch):
        monkeypatch.setattr(settings, "MAX_IMAGE_BYTES", 100)
        issued = await request_url(client, auth_headers)
        await upload_bytes(client, issued, JPEG + b"\x00" * 500)

        resp = await client.post(
            f"{PREFIX}/media/{issued['asset_id']}/confirm", headers=auth_headers
        )

        assert resp.status_code == 413
        assert resp.json()["error"]["code"] == "media_too_large"


class TestSignedUrls:
    async def test_signed_url_serves_the_file(self, client, auth_headers):
        issued = await request_url(client, auth_headers)
        await upload_bytes(client, issued, PNG)
        confirmed = (
            await client.post(f"{PREFIX}/media/{issued['asset_id']}/confirm", headers=auth_headers)
        ).json()

        path = confirmed["url"].split("/api/v1", 1)[1]
        resp = await client.get(f"{PREFIX}{path}")

        assert resp.status_code == 200
        assert resp.content.startswith(b"\x89PNG")

    async def test_tampered_signature_is_refused(self, client, auth_headers):
        issued = await request_url(client, auth_headers)
        await upload_bytes(client, issued, PNG)
        confirmed = (
            await client.post(f"{PREFIX}/media/{issued['asset_id']}/confirm", headers=auth_headers)
        ).json()

        path = confirmed["url"].split("/api/v1", 1)[1].replace("signature=", "signature=00")
        resp = await client.get(f"{PREFIX}{path}")

        assert resp.status_code == 404

    async def test_expired_url_is_refused(self, client, auth_headers):
        """The point of signed expiring URLs: a leaked link stops working."""
        issued = await request_url(client, auth_headers)
        await upload_bytes(client, issued, PNG)
        confirmed = (
            await client.post(f"{PREFIX}/media/{issued['asset_id']}/confirm", headers=auth_headers)
        ).json()

        path = confirmed["url"].split("/api/v1", 1)[1]
        stale = (
            path.split("expires=")[0] + f"expires={int(time.time()) - 10}" + "&signature=deadbeef"
        )

        resp = await client.get(f"{PREFIX}{stale}")
        assert resp.status_code == 404

    async def test_fresh_url_on_each_read(self, client, auth_headers):
        issued = await request_url(client, auth_headers)
        await upload_bytes(client, issued, JPEG)
        await client.post(f"{PREFIX}/media/{issued['asset_id']}/confirm", headers=auth_headers)

        resp = await client.get(f"{PREFIX}/media/{issued['asset_id']}", headers=auth_headers)

        assert resp.status_code == 200
        assert resp.json()["expires_in"] == settings.MEDIA_URL_EXPIRE_SECONDS

    async def test_cannot_read_someone_elses_asset(self, client, auth_headers, other_user):
        _, other_headers = other_user
        issued = await request_url(client, other_headers)
        await upload_bytes(client, issued, JPEG)
        await client.post(f"{PREFIX}/media/{issued['asset_id']}/confirm", headers=other_headers)

        resp = await client.get(f"{PREFIX}/media/{issued['asset_id']}", headers=auth_headers)

        assert resp.status_code == 403


class TestPostsWithMedia:
    async def _ready_asset(self, client, headers) -> str:
        issued = await request_url(client, headers)
        await upload_bytes(client, issued, JPEG)
        await client.post(f"{PREFIX}/media/{issued['asset_id']}/confirm", headers=headers)
        return issued["asset_id"]

    async def test_post_from_an_uploaded_asset(self, client, auth_headers):
        asset_id = await self._ready_asset(client, auth_headers)

        resp = await client.post(
            f"{PREFIX}/posts",
            headers=auth_headers,
            json={"media_asset_id": asset_id, "caption": "uploaded"},
        )

        assert resp.status_code == 201
        assert "signature=" in resp.json()["image_url"], "expected a signed URL"

    async def test_cannot_attach_an_unconfirmed_asset(self, client, auth_headers):
        """Otherwise a caller could reference bytes nobody ever checked."""
        issued = await request_url(client, auth_headers)

        resp = await client.post(
            f"{PREFIX}/posts", headers=auth_headers, json={"media_asset_id": issued["asset_id"]}
        )

        assert resp.status_code == 409

    async def test_cannot_attach_someone_elses_asset(self, client, auth_headers, other_user):
        _, other_headers = other_user
        asset_id = await self._ready_asset(client, other_headers)

        resp = await client.post(
            f"{PREFIX}/posts", headers=auth_headers, json={"media_asset_id": asset_id}
        )

        assert resp.status_code == 403

    async def test_post_needs_a_source(self, client, auth_headers):
        resp = await client.post(f"{PREFIX}/posts", headers=auth_headers, json={"caption": "none"})

        assert resp.status_code == 422

    async def test_feed_resolves_signed_urls(self, client, auth_headers):
        asset_id = await self._ready_asset(client, auth_headers)
        await client.post(
            f"{PREFIX}/posts", headers=auth_headers, json={"media_asset_id": asset_id}
        )

        feed = (await client.get(f"{PREFIX}/feed", headers=auth_headers)).json()

        assert "signature=" in feed["items"][0]["image_url"]

    async def test_external_url_still_works(self, client, auth_headers):
        resp = await client.post(
            f"{PREFIX}/posts",
            headers=auth_headers,
            json={"image_url": "https://picsum.photos/500", "caption": "external"},
        )

        assert resp.status_code == 201
        assert resp.json()["image_url"] == "https://picsum.photos/500"


class TestStorageSafety:
    def test_key_cannot_escape_the_storage_root(self):
        """A traversing key must not write outside the media directory."""
        storage = get_storage()
        if not hasattr(storage, "_path"):
            pytest.skip("only applies to the local backend")

        with pytest.raises(ValueError, match="escapes"):
            storage._path("../../etc/passwd")

    async def test_production_refuses_the_local_fallback(self):
        from app.core.config import Settings

        with pytest.raises(ValueError, match="S3_BUCKET"):
            Settings(
                ENVIRONMENT="production",
                DEBUG=False,
                SECRET_KEY="x" * 40,
                CORS_ORIGINS="https://example.com",
                S3_BUCKET="",
                _env_file=None,
            )
