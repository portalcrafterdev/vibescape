import base64
import hashlib
import time
from urllib.parse import quote

import httpx

from app.core.config import Settings
from app.core.exceptions import AppError
from app.core.logging import get_logger

log = get_logger(__name__)

API_BASE = "https://api.cloudinary.com/v1_1"
DELIVERY_BASE = "https://res.cloudinary.com"


class CloudinaryConfigError(AppError):
    status_code = 500
    code = "storage_misconfigured"
    message = "Media storage is not configured correctly"


class CloudinaryStorage:
    """Cloudinary-backed media storage.

    Signed direct uploads: the client posts straight to Cloudinary with parameters
    we sign, so bytes never pass through the API. Delivery uses `authenticated`
    assets, whose URLs carry a signature — see the note on expiry below.
    """

    def __init__(self, settings: Settings) -> None:
        if not settings.CLOUDINARY_CLOUD_NAME:
            raise CloudinaryConfigError("CLOUDINARY_CLOUD_NAME is not set")
        self._cloud = settings.CLOUDINARY_CLOUD_NAME
        self._key = settings.CLOUDINARY_API_KEY
        self._secret = settings.CLOUDINARY_API_SECRET
        self._timeout = 15.0

    # ------------------------------------------------------------------ signing

    def _sign(self, params: dict[str, str]) -> str:
        """Cloudinary's scheme: sorted `k=v` pairs joined by &, then the secret,
        hashed with SHA-1. `file`, `api_key` and `resource_type` are excluded."""
        payload = "&".join(f"{k}={params[k]}" for k in sorted(params) if params[k] != "")
        return hashlib.sha1(f"{payload}{self._secret}".encode()).hexdigest()  # noqa: S324

    @staticmethod
    def _resource_type(content_type: str) -> str:
        return "video" if content_type.startswith("video/") else "image"

    # ------------------------------------------------------------------ uploads

    async def presigned_put(
        self, key: str, *, content_type: str, max_bytes: int, expires_in: int
    ) -> dict:
        """Signed parameters for a direct browser/app upload.

        Note the size ceiling is advisory here. Unlike an S3 POST policy, Cloudinary
        has no signed content-length condition, so `confirm` re-checks the real size
        and deletes anything over the limit. That check is what actually enforces it.
        """
        resource_type = self._resource_type(content_type)
        timestamp = int(time.time())

        # public_id carries our server-generated key, minus the extension which
        # Cloudinary appends itself from the uploaded format.
        public_id = key.rsplit(".", 1)[0]

        params = {
            "public_id": public_id,
            "timestamp": str(timestamp),
            # Authenticated assets are not reachable from a plain delivery URL, so a
            # guessed public_id alone does not grant access.
            "type": "authenticated",
        }
        signature = self._sign(params)

        return {
            "url": f"{API_BASE}/{self._cloud}/{resource_type}/upload",
            "fields": {
                **params,
                "api_key": self._key,
                "signature": signature,
            },
            "max_bytes": max_bytes,
        }

    # ------------------------------------------------------------------ delivery

    async def presigned_get(self, key: str, *, expires_in: int) -> str:
        """A signed delivery URL for an authenticated asset.

        ⚠️ The signature prevents URL tampering but does NOT expire. Cloudinary's
        time-limited delivery needs token-based authentication, which is a paid
        add-on. If genuine expiry is required, either enable that add-on or upload
        as `private` and hand out `private_download_url` links instead.
        """
        public_id = key.rsplit(".", 1)[0]
        resource_type = self._resource_type_for_key(key)

        # Cloudinary's delivery signature: first 8 chars of base64url(SHA-1(path + secret)).
        digest = hashlib.sha1(f"{public_id}{self._secret}".encode()).digest()  # noqa: S324
        signature = base64.urlsafe_b64encode(digest).decode().rstrip("=")[:8]

        return (
            f"{DELIVERY_BASE}/{self._cloud}/{resource_type}/authenticated"
            f"/s--{signature}--/{quote(public_id, safe='/')}"
        )

    @staticmethod
    def _resource_type_for_key(key: str) -> str:
        return "video" if key.endswith((".mp4", ".mov")) else "image"

    # ------------------------------------------------------------------ admin

    async def _admin(self, method: str, path: str, **kwargs) -> httpx.Response:
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            return await client.request(
                method,
                f"{API_BASE}/{self._cloud}/{path}",
                auth=(self._key, self._secret),
                **kwargs,
            )

    async def head(self, key: str) -> dict | None:
        public_id = key.rsplit(".", 1)[0]
        resource_type = self._resource_type_for_key(key)

        resp = await self._admin(
            "GET",
            f"resources/{resource_type}/authenticated/{quote(public_id, safe='')}",
        )
        if resp.status_code == 404:
            return None
        resp.raise_for_status()

        body = resp.json()
        return {
            "size": body.get("bytes", 0),
            "content_type": f"{resource_type}/{body.get('format', '')}",
        }

    async def read_range(self, key: str, *, length: int) -> bytes:
        """Fetch the leading bytes for signature sniffing.

        Cloudinary re-encodes uploads, so what comes back is its normalised output
        rather than the original file. That is still the right thing to check: it is
        what will actually be served to other people.
        """
        url = await self.presigned_get(key, expires_in=60)
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            resp = await client.get(url, headers={"Range": f"bytes=0-{length - 1}"})
            if resp.status_code >= 400:
                return b""
            return resp.content[:length]

    async def delete(self, key: str) -> None:
        public_id = key.rsplit(".", 1)[0]
        resource_type = self._resource_type_for_key(key)
        timestamp = int(time.time())

        params = {
            "public_id": public_id,
            "timestamp": str(timestamp),
            "type": "authenticated",
        }
        await self._admin(
            "POST",
            f"{resource_type}/destroy",
            data={**params, "api_key": self._key, "signature": self._sign(params)},
        )
