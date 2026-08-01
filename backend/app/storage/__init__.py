from functools import lru_cache

from app.core.config import get_settings
from app.storage.base import StorageBackend
from app.storage.local import LocalStorage
from app.storage.s3 import S3Storage

__all__ = ["StorageBackend", "get_storage"]


@lru_cache
def get_storage() -> StorageBackend:
    """Pick a backend from configuration.

    Falls back to local disk when no bucket is configured so development works
    without credentials. Settings validation refuses that combination in
    production, so the fallback cannot be reached by a misconfigured deploy.
    """
    settings = get_settings()
    if settings.S3_BUCKET:
        return S3Storage(settings)
    return LocalStorage(settings)
