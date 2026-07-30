import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.core.config import get_settings

_settings = get_settings()

# Argon2id, the default type. Chosen over bcrypt: no 72-byte input truncation and
# meaningfully better GPU resistance.
_hasher = PasswordHasher(
    time_cost=3,
    memory_cost=64 * 1024,  # 64 MiB
    parallelism=4,
    hash_len=32,
    salt_len=16,
)

# Verified against when no user matches, so a missing account costs the same time as a
# wrong password. Without this, response timing reveals which emails are registered.
_DUMMY_HASH = _hasher.hash("dummy-password-for-constant-time-comparison")

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return _hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        _hasher.verify(password_hash, password)
        return True
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def verify_dummy_password(password: str) -> None:
    """Burn equivalent time when the account does not exist."""
    try:
        _hasher.verify(_DUMMY_HASH, password)
    except Exception:  # noqa: BLE001, S110 - only the elapsed time matters here
        pass


def needs_rehash(password_hash: str) -> bool:
    """True when the stored hash predates the current cost parameters."""
    try:
        return _hasher.check_needs_rehash(password_hash)
    except InvalidHashError:
        return True


def create_access_token(user_id: uuid.UUID) -> tuple[str, str, datetime]:
    """Return (token, jti, expires_at).

    The jti is what logout adds to the denylist — stateless JWTs cannot otherwise be
    revoked before they expire.
    """
    now = datetime.now(UTC)
    expires_at = now + timedelta(minutes=_settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    jti = uuid.uuid4().hex

    payload = {
        "sub": str(user_id),
        "jti": jti,
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int(expires_at.timestamp()),
    }
    token = jwt.encode(payload, _settings.SECRET_KEY, algorithm=ALGORITHM)
    return token, jti, expires_at


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Decode and validate, or None. Never raises on bad input."""
    try:
        payload = jwt.decode(
            token,
            _settings.SECRET_KEY,
            algorithms=[ALGORITHM],  # pinned: never trust the header's alg
            options={"require": ["exp", "iat", "sub", "jti"]},
        )
    except jwt.PyJWTError:
        return None

    # A refresh token must never be accepted where an access token is expected.
    if payload.get("type") != "access":
        return None
    return payload


def generate_refresh_token() -> tuple[str, str]:
    """Return (raw_token, sha256_hash).

    Opaque and random rather than a JWT: a refresh token has to be revocable, which
    means a server-side record either way, and an opaque value carries no readable
    claims if it leaks.
    """
    raw = secrets.token_urlsafe(48)
    return raw, hash_token(raw)


def hash_token(raw: str) -> str:
    """SHA-256 for stored token lookup.

    Plain SHA-256 rather than Argon2 on purpose: these are 384-bit random values, not
    user-chosen secrets, so there is nothing to brute force and lookups stay indexable.
    """
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def generate_reset_token() -> tuple[str, str]:
    raw = secrets.token_urlsafe(32)
    return raw, hash_token(raw)


def constant_time_compare(a: str, b: str) -> bool:
    return secrets.compare_digest(a, b)
