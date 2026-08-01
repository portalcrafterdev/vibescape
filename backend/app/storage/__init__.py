from functools import lru_cache

from app.core.config import get_settings
from app.storage.base import StorageBackend
from app.storage.cloudinary import CloudinaryStorage
from app.storage.local import LocalStorage
from app.storage.s3 import S3Storage

__all__ = ["StorageBackend", "get_storage"]


@lru_cache
def get_storage() -> StorageBackend:
    """Pick a backend from configuration.

    `auto` chooses by which credentials are present, so adding a cloud name or a
    bucket is the whole switch. The local-disk fallback keeps development working
    without an account; settings validation refuses it in production, so it cannot
    be reached by a misconfigured deploy.
    """
    settings = get_settings()

    choice = settings.MEDIA_BACKEND
    if choice == "auto":
        if settings.CLOUDINARY_CLOUD_NAME:
            choice = "cloudinary"
        elif settings.S3_BUCKET:
            choice = "s3"
        else:
            choice = "local"

    if choice == "cloudinary":
        return CloudinaryStorage(settings)
    if choice == "s3":
        return S3Storage(settings)
    return LocalStorage(settings)
