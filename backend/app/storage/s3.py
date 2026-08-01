from contextlib import asynccontextmanager

import aioboto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.core.config import Settings
from app.core.logging import get_logger

log = get_logger(__name__)


class S3Storage:
    """S3-compatible object storage.

    Works unchanged against AWS S3, Cloudflare R2, DigitalOcean Spaces and MinIO —
    they share the API, so moving between them is an endpoint URL change.
    """

    def __init__(self, settings: Settings) -> None:
        self._bucket = settings.S3_BUCKET
        self._endpoint = settings.S3_ENDPOINT_URL or None
        self._region = settings.S3_REGION
        self._access_key = settings.S3_ACCESS_KEY_ID
        self._secret_key = settings.S3_SECRET_ACCESS_KEY
        self._session = aioboto3.Session()

    @asynccontextmanager
    async def _client(self):
        async with self._session.client(
            "s3",
            endpoint_url=self._endpoint,
            region_name=self._region,
            aws_access_key_id=self._access_key,
            aws_secret_access_key=self._secret_key,
            # SigV4 is required for presigned URLs to carry a content-length
            # condition on most S3-compatible providers.
            config=Config(signature_version="s3v4"),
        ) as client:
            yield client

    async def presigned_put(
        self, key: str, *, content_type: str, max_bytes: int, expires_in: int
    ) -> dict:
        """Presigned POST rather than PUT.

        A POST policy can carry a content-length-range condition, so the storage
        provider itself rejects an oversized upload. A presigned PUT cannot, which
        would leave the size limit unenforceable once the URL is handed out.
        """
        async with self._client() as client:
            return await client.generate_presigned_post(
                Bucket=self._bucket,
                Key=key,
                Fields={"Content-Type": content_type},
                Conditions=[
                    {"Content-Type": content_type},
                    ["content-length-range", 1, max_bytes],
                ],
                ExpiresIn=expires_in,
            )

    async def presigned_get(self, key: str, *, expires_in: int) -> str:
        async with self._client() as client:
            return await client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self._bucket, "Key": key},
                ExpiresIn=expires_in,
            )

    async def head(self, key: str) -> dict | None:
        try:
            async with self._client() as client:
                meta = await client.head_object(Bucket=self._bucket, Key=key)
        except ClientError as exc:
            if exc.response.get("Error", {}).get("Code") in {"404", "NoSuchKey", "NotFound"}:
                return None
            raise
        return {"size": meta["ContentLength"], "content_type": meta.get("ContentType")}

    async def read_range(self, key: str, *, length: int) -> bytes:
        """Fetch only the leading bytes — enough to identify the format, no more."""
        async with self._client() as client:
            obj = await client.get_object(
                Bucket=self._bucket, Key=key, Range=f"bytes=0-{length - 1}"
            )
            async with obj["Body"] as stream:
                return await stream.read()

    async def delete(self, key: str) -> None:
        async with self._client() as client:
            await client.delete_object(Bucket=self._bucket, Key=key)
