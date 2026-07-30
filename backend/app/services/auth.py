import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache.redis import get_redis
from app.core import security
from app.core.config import get_settings
from app.core.exceptions import AppError
from app.core.logging import get_logger
from app.models.token import PasswordResetToken, RefreshToken
from app.models.user import User

log = get_logger(__name__)
_settings = get_settings()


class InvalidCredentialsError(AppError):
    status_code = 401
    code = "invalid_credentials"
    # Identical whether the account is missing or the password is wrong. Distinct
    # messages would let anyone enumerate registered accounts.
    message = "Incorrect username or password"


class AccountLockedError(AppError):
    status_code = 423
    code = "account_locked"
    message = "Too many failed attempts. Try again later."


class InvalidTokenError(AppError):
    status_code = 401
    code = "invalid_token"
    message = "Token is invalid or has expired"


class UsernameTakenError(AppError):
    status_code = 409
    code = "username_taken"
    message = "That username is already taken"


class EmailTakenError(AppError):
    status_code = 409
    code = "email_taken"
    message = "An account with that email already exists"


def _now() -> datetime:
    return datetime.now(UTC)


def _denylist_key(jti: str) -> str:
    return f"vibescape:denylist:access:{jti}"


# ---------------------------------------------------------------- registration


async def register(db: AsyncSession, *, username: str, email: str, password: str) -> User:
    user = User(
        username=username,
        email=email,
        password_hash=security.hash_password(password),
    )
    db.add(user)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        # Re-query to report which field collided. This does leak existence, but a
        # registration form has to tell the user their username is taken to be usable
        # at all. Login and password reset, where enumeration actually matters, stay
        # silent.
        existing = await db.scalar(
            select(User).where(or_(User.username == username, User.email == email))
        )
        if existing and existing.username == username:
            raise UsernameTakenError() from None
        raise EmailTakenError() from None

    await db.refresh(user)
    log.info("user_registered", user_id=str(user.id))
    return user


# ---------------------------------------------------------------- login


def _lockout_duration(failed_count: int) -> timedelta:
    """Exponential backoff, capped."""
    over = max(0, failed_count - _settings.MAX_FAILED_LOGINS)
    minutes = min(_settings.LOCKOUT_BASE_MINUTES * (2**over), _settings.LOCKOUT_MAX_MINUTES)
    return timedelta(minutes=minutes)


async def authenticate(db: AsyncSession, *, identifier: str, password: str) -> User:
    user = await db.scalar(
        select(User).where(or_(User.username == identifier, User.email == identifier))
    )

    if user is None:
        # Spend comparable time so a missing account is not detectable by latency.
        security.verify_dummy_password(password)
        raise InvalidCredentialsError()

    if user.locked_until is not None and user.locked_until > _now():
        raise AccountLockedError()

    if not security.verify_password(password, user.password_hash):
        user.failed_login_count += 1
        if user.failed_login_count >= _settings.MAX_FAILED_LOGINS:
            user.locked_until = _now() + _lockout_duration(user.failed_login_count)
            log.warning("account_locked", user_id=str(user.id))
        await db.commit()
        raise InvalidCredentialsError()

    if not user.is_active:
        raise InvalidCredentialsError()

    # Opportunistically upgrade hashes when cost parameters change.
    if security.needs_rehash(user.password_hash):
        user.password_hash = security.hash_password(password)

    user.failed_login_count = 0
    user.locked_until = None
    await db.commit()
    await db.refresh(user)
    return user


# ---------------------------------------------------------------- token issuing


async def issue_token_pair(
    db: AsyncSession, user: User, *, family_id: uuid.UUID | None = None
) -> tuple[str, str, int]:
    """Return (access_token, refresh_token, access_expires_in_seconds)."""
    access_token, _jti, access_expires = security.create_access_token(user.id)
    raw_refresh, refresh_hash = security.generate_refresh_token()

    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=refresh_hash,
            family_id=family_id or uuid.uuid4(),
            expires_at=_now() + timedelta(days=_settings.REFRESH_TOKEN_EXPIRE_DAYS),
        )
    )
    await db.commit()

    expires_in = int((access_expires - _now()).total_seconds())
    return access_token, raw_refresh, expires_in


async def rotate_refresh_token(db: AsyncSession, raw_token: str) -> tuple[User, str, str, int]:
    """Exchange a refresh token for a new pair.

    Presenting an already-spent token means the value leaked and is being replayed,
    so the entire family is revoked — the legitimate holder is logged out too, which
    is the correct outcome when a session is known to be compromised.
    """
    token_hash = security.hash_token(raw_token)
    record = await db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))

    if record is None:
        raise InvalidTokenError()

    if record.revoked_at is not None:
        log.warning(
            "refresh_token_reuse_detected",
            user_id=str(record.user_id),
            family_id=str(record.family_id),
        )
        await _revoke_family(db, record.family_id)
        raise InvalidTokenError()

    if record.expires_at <= _now():
        raise InvalidTokenError()

    user = await db.get(User, record.user_id)
    if user is None or not user.is_active:
        raise InvalidTokenError()

    record.revoked_at = _now()
    await db.flush()

    access_token, raw_refresh, expires_in = await issue_token_pair(
        db, user, family_id=record.family_id
    )
    return user, access_token, raw_refresh, expires_in


async def _revoke_family(db: AsyncSession, family_id: uuid.UUID) -> None:
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.family_id == family_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=_now())
    )
    await db.commit()


# ---------------------------------------------------------------- logout


async def logout(db: AsyncSession, *, jti: str, expires_at: datetime, raw_refresh: str | None):
    """Revoke the refresh family and denylist the access token.

    Access tokens are stateless, so without the denylist a "logged out" token keeps
    working until it expires.
    """
    if raw_refresh:
        record = await db.scalar(
            select(RefreshToken).where(RefreshToken.token_hash == security.hash_token(raw_refresh))
        )
        if record is not None:
            await _revoke_family(db, record.family_id)

    ttl = int((expires_at - _now()).total_seconds())
    if ttl > 0:
        try:
            await get_redis().set(_denylist_key(jti), "1", ex=ttl)
        except Exception as exc:  # noqa: BLE001
            # Refresh revocation above is the durable part; this only shortens the
            # window on an already-issued access token.
            log.warning("denylist_write_failed", error=str(exc))


async def is_access_token_revoked(jti: str) -> bool:
    try:
        return await get_redis().exists(_denylist_key(jti)) > 0
    except Exception as exc:  # noqa: BLE001
        log.warning("denylist_read_failed", error=str(exc))
        return False


# ---------------------------------------------------------------- password reset


async def create_password_reset(db: AsyncSession, *, email: str) -> str | None:
    """Return the raw token, or None when no account matches.

    Callers must respond identically either way.
    """
    user = await db.scalar(select(User).where(User.email == email))
    if user is None:
        return None

    raw, token_hash = security.generate_reset_token()
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=_now() + timedelta(minutes=_settings.PASSWORD_RESET_EXPIRE_MINUTES),
        )
    )
    await db.commit()
    log.info("password_reset_requested", user_id=str(user.id))
    return raw


async def reset_password(db: AsyncSession, *, raw_token: str, new_password: str) -> None:
    record = await db.scalar(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == security.hash_token(raw_token)
        )
    )

    if record is None or record.used_at is not None or record.expires_at <= _now():
        raise InvalidTokenError()

    user = await db.get(User, record.user_id)
    if user is None:
        raise InvalidTokenError()

    user.password_hash = security.hash_password(new_password)
    user.failed_login_count = 0
    user.locked_until = None
    record.used_at = _now()

    # A password change means every existing session should end.
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user.id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=_now())
    )
    await db.commit()
    log.info("password_reset_completed", user_id=str(user.id))
