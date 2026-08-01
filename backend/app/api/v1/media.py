import time
import uuid
from typing import Annotated

from fastapi import APIRouter, Query, Request, Response, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field

from app.core.config import get_settings
from app.core.deps import CurrentUser, DbSession
from app.core.exceptions import AppError, NotFoundError
from app.core.logging import get_logger
from app.services import media as service
from app.storage import get_storage
from app.storage.local import LocalStorage

log = get_logger(__name__)
router = APIRouter(prefix="/media", tags=["media"])
settings = get_settings()


class UploadUrlRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    content_type: str = Field(min_length=1, max_length=100)


class UploadUrlResponse(BaseModel):
    asset_id: uuid.UUID
    upload_url: str
    fields: dict
    max_bytes: int
    expires_in: int


class MediaOut(BaseModel):
    asset_id: uuid.UUID
    url: str
    content_type: str | None = None
    size_bytes: int | None = None
    expires_in: int


@router.post("/upload-url", response_model=UploadUrlResponse)
async def create_upload_url(
    payload: UploadUrlRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> UploadUrlResponse:
    """Get a URL to upload a file directly to storage.

    POST the returned `fields` plus the file to `upload_url` as multipart form
    data, then call `/media/{asset_id}/confirm`. The storage key is generated
    server-side; a caller-supplied path would let one user overwrite another's
    object.
    """
    asset, form, max_bytes = await service.request_upload(
        db, owner=current_user, content_type=payload.content_type
    )
    return UploadUrlResponse(
        asset_id=asset.id,
        upload_url=form["url"],
        fields=form.get("fields", {}),
        max_bytes=max_bytes,
        expires_in=settings.UPLOAD_URL_EXPIRE_SECONDS,
    )


@router.post("/{asset_id}/confirm", response_model=MediaOut)
async def confirm_upload(
    asset_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
) -> MediaOut:
    """Verify the uploaded bytes and make the asset usable.

    The file's actual signature is inspected here. A declared content type proves
    nothing — anything can claim to be a JPEG.
    """
    asset = await service.confirm_upload(db, owner=current_user, asset_id=asset_id)
    return MediaOut(
        asset_id=asset.id,
        url=await service.signed_url(asset),
        content_type=asset.content_type,
        size_bytes=asset.size_bytes,
        expires_in=settings.MEDIA_URL_EXPIRE_SECONDS,
    )


@router.get("/{asset_id}", response_model=MediaOut)
async def get_media(
    asset_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
) -> MediaOut:
    """A fresh signed URL for an asset. Call again once the previous one expires."""
    asset = await service.get_ready_asset(db, owner=current_user, asset_id=asset_id)
    return MediaOut(
        asset_id=asset.id,
        url=await service.signed_url(asset),
        content_type=asset.content_type,
        size_bytes=asset.size_bytes,
        expires_in=settings.MEDIA_URL_EXPIRE_SECONDS,
    )


# ---------------------------------------------------------------- local backend
# These two exist only for the filesystem fallback used in development. With S3
# configured they are never reached — the client talks to the provider directly.


class LocalUploadError(AppError):
    status_code = status.HTTP_400_BAD_REQUEST
    code = "invalid_upload"
    message = "Invalid upload request"


@router.post("/local/upload", include_in_schema=False)
async def local_upload(request: Request) -> Response:
    """Accept a multipart upload for the local dev backend."""
    storage = get_storage()
    if not isinstance(storage, LocalStorage):
        raise NotFoundError("Not available")

    form = await request.form()
    key = str(form.get("key", ""))
    expires = str(form.get("expires", "0"))
    signature = str(form.get("signature", ""))
    upload = form.get("file")

    if not key or upload is None:
        raise LocalUploadError("Missing key or file")

    try:
        expires_at = int(expires)
    except ValueError:
        raise LocalUploadError("Malformed expiry") from None

    if not storage.verify(key, expires_at, signature):
        raise LocalUploadError("Upload URL is invalid or has expired")

    data = await upload.read()
    await storage.write(key, data)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/local/{key:path}", include_in_schema=False)
async def local_download(
    key: str,
    expires: Annotated[int, Query()] = 0,
    signature: Annotated[str, Query()] = "",
):
    """Serve a local file, honouring the same signature and expiry as S3 would."""
    storage = get_storage()
    if not isinstance(storage, LocalStorage):
        raise NotFoundError("Not available")

    if not storage.verify(key, expires, signature):
        raise NotFoundError("Link is invalid or has expired")

    path = storage._path(key)  # noqa: SLF001 - dev-only backend
    if not path.is_file():
        raise NotFoundError("File not found")

    return FileResponse(path)


@router.get("/local/_now", include_in_schema=False)
async def local_now() -> dict:
    """Server clock, so tests can reason about signed-URL expiry."""
    return {"now": int(time.time())}
