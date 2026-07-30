from fastapi import APIRouter, Depends, Request, Response, status

from app.core.config import get_settings
from app.core.deps import ClientIP, CurrentUser, DbSession
from app.core.exceptions import AppError
from app.core.logging import get_logger
from app.core.security import decode_access_token
from app.schemas.auth import (
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    LogoutRequest,
    MessageResponse,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenPair,
    UserPrivate,
)
from app.services import auth as auth_service
from app.services import rate_limit

log = get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()

# Identical for existing and unknown accounts — the whole point of the endpoint.
_RESET_SENT_MESSAGE = "If an account exists for that email, a reset link has been sent."


class RateLimitedError(AppError):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    code = "rate_limited"
    message = "Too many requests. Please slow down."


async def throttle(ip: ClientIP) -> None:
    """Per-IP limit on every auth endpoint. Tighter than the global default."""
    try:
        await rate_limit.check_auth_endpoint(ip)
    except rate_limit.RateLimitExceeded as exc:
        raise RateLimitedError(
            f"Too many requests. Try again in {exc.retry_after} seconds."
        ) from None


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(throttle)],
)
async def register(payload: RegisterRequest, db: DbSession) -> AuthResponse:
    """Create an account and sign in immediately."""
    user = await auth_service.register(
        db, username=payload.username, email=payload.email, password=payload.password
    )
    access, refresh, expires_in = await auth_service.issue_token_pair(db, user)

    return AuthResponse(
        user=UserPrivate.model_validate(user),
        tokens=TokenPair(access_token=access, refresh_token=refresh, expires_in=expires_in),
    )


@router.post("/login", response_model=AuthResponse, dependencies=[Depends(throttle)])
async def login(payload: LoginRequest, db: DbSession) -> AuthResponse:
    """Exchange credentials for a token pair.

    Wrong password and unknown account return the same 401 with the same message.
    """
    user = await auth_service.authenticate(
        db, identifier=payload.identifier, password=payload.password
    )
    access, refresh, expires_in = await auth_service.issue_token_pair(db, user)

    return AuthResponse(
        user=UserPrivate.model_validate(user),
        tokens=TokenPair(access_token=access, refresh_token=refresh, expires_in=expires_in),
    )


@router.post("/refresh", response_model=TokenPair, dependencies=[Depends(throttle)])
async def refresh(payload: RefreshRequest, db: DbSession) -> TokenPair:
    """Rotate a refresh token.

    The presented token is consumed. Replaying a spent one revokes every token in its
    family, on the assumption it was stolen.
    """
    _user, access, new_refresh, expires_in = await auth_service.rotate_refresh_token(
        db, payload.refresh_token
    )
    return TokenPair(access_token=access, refresh_token=new_refresh, expires_in=expires_in)


@router.post("/logout", response_model=MessageResponse)
async def logout(
    payload: LogoutRequest,
    request: Request,
    db: DbSession,
    current_user: CurrentUser,
) -> MessageResponse:
    """Revoke the session.

    Supplying the refresh token ends the whole family; without it only the current
    access token is denylisted.
    """
    header = request.headers.get("authorization", "")
    token = header[7:] if header.lower().startswith("bearer ") else ""
    claims = decode_access_token(token)

    if claims is not None:
        from datetime import UTC, datetime

        await auth_service.logout(
            db,
            jti=claims["jti"],
            expires_at=datetime.fromtimestamp(claims["exp"], tz=UTC),
            raw_refresh=payload.refresh_token,
        )

    log.info("user_logged_out", user_id=str(current_user.id))
    return MessageResponse(message="Signed out")


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    dependencies=[Depends(throttle)],
)
async def forgot_password(
    payload: ForgotPasswordRequest, db: DbSession, response: Response
) -> MessageResponse:
    """Begin a password reset.

    Always reports success. Telling the caller whether an email is registered would
    turn this into an account-enumeration oracle.
    """
    raw_token = await auth_service.create_password_reset(db, email=payload.email)

    if raw_token is not None:
        # TODO(phase-3): send by email. Until a mail provider is configured the token
        # is returned in development only, so the flow is testable end to end. This
        # header is never set outside development.
        if settings.ENVIRONMENT == "development":
            response.headers["X-Debug-Reset-Token"] = raw_token

    return MessageResponse(message=_RESET_SENT_MESSAGE)


@router.post("/reset-password", response_model=MessageResponse, dependencies=[Depends(throttle)])
async def reset_password(payload: ResetPasswordRequest, db: DbSession) -> MessageResponse:
    """Complete a password reset. Ends every existing session for that account."""
    await auth_service.reset_password(
        db, raw_token=payload.token, new_password=payload.new_password
    )
    return MessageResponse(message="Password updated. Please sign in again.")


@router.get("/me", response_model=UserPrivate)
async def me(current_user: CurrentUser) -> UserPrivate:
    """The authenticated user's own record."""
    return UserPrivate.model_validate(current_user)
