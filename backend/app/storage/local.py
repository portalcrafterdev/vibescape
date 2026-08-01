import hashlib
import hmac
import time
from pathlib import Path

from app.core.config import Settings
from app.core.logging import get_logger

log = get_logger(__name__)


class LocalStorage:
    """Filesystem-backed storage for development, when no S3 credentials exist.

    It keeps the whole upload flow exercisable — including signature sniffing and
    signed-URL expiry — without an account. It is explicitly not for deployment:
    files do not survive a rebuild and cannot be shared across machines. The app
    refuses to start in production with this selected.
    """

    def __init__(self, settings: Settings) -> None:
        self._root = Path(settings.LOCAL_STORAGE_DIR).resolve()
        self._root.mkdir(parents=True, exist_ok=True)
        self._secret = settings.SECRET_KEY
        self._base = settings.LOCAL_STORAGE_PUBLIC_BASE

    def _path(self, key: str) -> Path:
        # Resolve and confirm containment: a key like "../../etc/passwd" must not
        # escape the storage root.
        candidate = (self._root / key).resolve()
        if not candidate.is_relative_to(self._root):
            raise ValueError("storage key escapes the root directory")
        return candidate

    def _sign(self, key: str, expires_at: int) -> str:
        payload = f"{key}:{expires_at}".encode()
        return hmac.new(self._secret.encode(), payload, hashlib.sha256).hexdigest()

    def verify(self, key: str, expires_at: int, signature: str) -> bool:
        if expires_at < int(time.time()):
            return False
        return hmac.compare_digest(self._sign(key, expires_at), signature)

    async def presigned_put(
        self, key: str, *, content_type: str, max_bytes: int, expires_in: int
    ) -> dict:
        expires_at = int(time.time()) + expires_in
        return {
            "url": f"{self._base}/upload",
            "fields": {
                "key": key,
                "Content-Type": content_type,
                "expires": str(expires_at),
                "signature": self._sign(key, expires_at),
            },
        }

    async def presigned_get(self, key: str, *, expires_in: int) -> str:
        expires_at = int(time.time()) + expires_in
        signature = self._sign(key, expires_at)
        return f"{self._base}/{key}?expires={expires_at}&signature={signature}"

    async def head(self, key: str) -> dict | None:
        path = self._path(key)
        if not path.is_file():
            return None
        return {"size": path.stat().st_size, "content_type": None}

    async def read_range(self, key: str, *, length: int) -> bytes:
        path = self._path(key)
        if not path.is_file():
            return b""
        with path.open("rb") as handle:
            return handle.read(length)

    async def write(self, key: str, data: bytes) -> None:
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)

    async def delete(self, key: str) -> None:
        path = self._path(key)
        if path.is_file():
            path.unlink()
