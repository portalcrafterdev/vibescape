from typing import Protocol


class StorageBackend(Protocol):
    """What the API needs from object storage.

    Deliberately narrow. Everything above this layer works in terms of keys and
    URLs, so swapping S3 for another provider is one class rather than a rewrite.
    """

    async def presigned_put(
        self, key: str, *, content_type: str, max_bytes: int, expires_in: int
    ) -> dict:
        """A URL the client uploads to directly.

        Bytes must never proxy through the API — that would put every upload through
        our memory and bandwidth for no benefit.
        """
        ...

    async def presigned_get(self, key: str, *, expires_in: int) -> str:
        """A time-limited URL for reading. A leaked link stops working."""
        ...

    async def head(self, key: str) -> dict | None:
        """Size and content type of a stored object, or None if absent."""
        ...

    async def read_range(self, key: str, *, length: int) -> bytes:
        """First N bytes, for signature sniffing after an upload completes."""
        ...

    async def delete(self, key: str) -> None: ...
