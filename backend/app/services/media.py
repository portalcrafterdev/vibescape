import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import media_types
from app.core.config import get_settings
from app.core.exceptions import AppError, NotFoundError, PermissionDeniedError
from app.core.logging import get_logger
from app.models.media import MediaAsset, MediaStatus
from app.models.user import User
from app.services import rate_limit
from app.storage import get_storage

log = get_logger(__name__)
settings = get_settings()


class UnsupportedMediaError(AppError):
    status_code = 415
    code = "unsupported_media_type"
    message = "That file type is not supported"


class MediaNotUploadedError(AppError):
    status_code = 409
    code = "media_not_uploaded"
    message = "No file was uploaded for this asset"


class MediaTooLargeError(AppError):
    status_code = 413
    code = "media_too_large"
    message = "The uploaded file exceeds the maximum allowed size"


class UploadRateLimitedError(AppError):
    status_code = 429
    code = "upload_rate_limited"
    message = "Too many uploads. Please try again later."


def _now() -> datetime:
    return datetime.now(UTC)


def _max_bytes(content_type: str) -> int:
    return (
        settings.MAX_VIDEO_BYTES if content_type.startswith("video/") else settings.MAX_IMAGE_BYTES
    )


def _build_key(owner_id: uuid.UUID, asset_id: uuid.UUID, extension: str) -> str:
    """Server-generated key.

    The client never supplies any part of it. A caller-chosen path is how one user
    overwrites another's object, or escapes the prefix entirely.
    """
    stamp = _now().strftime("%Y/%m")
    return f"uploads/{owner_id}/{stamp}/{asset_id}.{extension}"


async def request_upload(
    db: AsyncSession, *, owner: User, content_type: str
) -> tuple[MediaAsset, dict, int]:
    """Issue a direct-to-storage upload URL.

    Returns the pending asset, the presigned form, and the byte ceiling carried in
    its policy. Bytes go straight to storage; routing them through the API would
    add nothing but load.
    """
    declared = content_type.split(";")[0].strip().lower()
    if not media_types.is_allowed_declared_type(declared):
        raise UnsupportedMediaError()

    try:
        await rate_limit.check(
            "upload",
            str(owner.id),
            limit=settings.RATE_LIMIT_UPLOADS_PER_USER,
            window_seconds=settings.RATE_LIMIT_UPLOAD_WINDOW_SECONDS,
        )
    except rate_limit.RateLimitExceeded as exc:
        raise UploadRateLimitedError(
            f"Too many uploads. Try again in {exc.retry_after} seconds."
        ) from None

    extension = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/gif": "gif",
        "image/webp": "webp",
        "video/mp4": "mp4",
        "video/quicktime": "mov",
    }[declared]

    asset_id = uuid.uuid4()
    key = _build_key(owner.id, asset_id, extension)
    limit = _max_bytes(declared)

    asset = MediaAsset(id=asset_id, owner_id=owner.id, storage_key=key, status=MediaStatus.PENDING)
    db.add(asset)
    await db.commit()
    await db.refresh(asset)

    form = await get_storage().presigned_put(
        key,
        content_type=declared,
        max_bytes=limit,
        expires_in=settings.UPLOAD_URL_EXPIRE_SECONDS,
    )

    log.info("upload_requested", asset_id=str(asset_id), owner=str(owner.id))
    return asset, form, limit


async def confirm_upload(db: AsyncSession, *, owner: User, asset_id: uuid.UUID) -> MediaAsset:
    """Verify an uploaded object and mark it usable.

    The declared content type is discarded here. What matters is the leading bytes
    of what actually landed — a renamed executable declares image/jpeg just as
    convincingly as a real one does.
    """
    asset = await db.get(MediaAsset, asset_id)
    if asset is None:
        raise NotFoundError("Media asset not found")
    if asset.owner_id != owner.id:
        raise PermissionDeniedError("You can only confirm your own uploads")

    if asset.status == MediaStatus.READY:
        return asset

    storage = get_storage()
    meta = await storage.head(asset.storage_key)
    if meta is None:
        raise MediaNotUploadedError()

    head = await storage.read_range(asset.storage_key, length=media_types.SNIFF_BYTES)
    kind = media_types.sniff(head)

    if kind is None:
        # Nothing recognisable arrived. Remove it rather than leaving an unusable
        # object costing storage.
        await storage.delete(asset.storage_key)
        await db.delete(asset)
        await db.commit()
        log.warning("upload_rejected_bad_signature", asset_id=str(asset_id))
        raise UnsupportedMediaError("The uploaded file is not a supported image or video")

    limit = _max_bytes(kind.content_type)
    if meta["size"] > limit:
        # The presigned policy should have stopped this at the provider; this is the
        # backstop for a backend that does not enforce the condition.
        await storage.delete(asset.storage_key)
        await db.delete(asset)
        await db.commit()
        raise MediaTooLargeError()

    asset.content_type = kind.content_type
    asset.size_bytes = meta["size"]
    asset.status = MediaStatus.READY
    asset.confirmed_at = _now()
    await db.commit()
    await db.refresh(asset)

    log.info("upload_confirmed", asset_id=str(asset_id), content_type=kind.content_type)
    return asset


async def signed_url(asset: MediaAsset) -> str:
    return await get_storage().presigned_get(
        asset.storage_key, expires_in=settings.MEDIA_URL_EXPIRE_SECONDS
    )


async def get_ready_asset(db: AsyncSession, *, owner: User, asset_id: uuid.UUID) -> MediaAsset:
    """Fetch an asset that is confirmed and belongs to the caller.

    Used when attaching media to a post: an unconfirmed key would let someone
    reference an object whose contents were never checked.
    """
    asset = await db.get(MediaAsset, asset_id)
    if asset is None:
        raise NotFoundError("Media asset not found")
    if asset.owner_id != owner.id:
        raise PermissionDeniedError("That media does not belong to you")
    if asset.status != MediaStatus.READY:
        raise MediaNotUploadedError("That media has not been confirmed yet")
    return asset


async def list_own(db: AsyncSession, *, owner: User, limit: int) -> list[MediaAsset]:
    rows = await db.scalars(
        select(MediaAsset)
        .where(MediaAsset.owner_id == owner.id, MediaAsset.status == MediaStatus.READY)
        .order_by(MediaAsset.created_at.desc())
        .limit(limit)
    )
    return list(rows.all())
