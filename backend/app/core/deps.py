import uuid
from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import security
from app.core.exceptions import AppError
from app.db.session import get_db
from app.models.user import User
from app.services import auth as auth_service


class NotAuthenticatedError(AppError):
    status_code = 401
    code = "not_authenticated"
    message = "Authentication required"


# auto_error=False so a missing header raises our envelope, not Starlette's shape.
_bearer = HTTPBearer(auto_error=False)

DbSession = Annotated[AsyncSession, Depends(get_db)]


async def get_current_user(
    db: DbSession,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)] = None,
) -> User:
    """Resolve the caller from a bearer token.

    Every non-public route depends on this. Note it answers "who is this", not "may
    they touch this object" — ownership is checked separately at each endpoint.
    """
    if credentials is None or not credentials.credentials:
        raise NotAuthenticatedError()

    payload = security.decode_access_token(credentials.credentials)
    if payload is None:
        raise NotAuthenticatedError()

    if await auth_service.is_access_token_revoked(payload["jti"]):
        raise NotAuthenticatedError()

    try:
        user_id = uuid.UUID(payload["sub"])
    except (ValueError, KeyError, TypeError):
        raise NotAuthenticatedError() from None

    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise NotAuthenticatedError()

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def client_ip(request: Request) -> str:
    """Best-effort client address for rate limiting.

    X-Forwarded-For is client-controlled and only trustworthy behind a proxy that
    overwrites it. Deployment must ensure that; otherwise limits are trivially evaded
    by spoofing the header.
    """
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


ClientIP = Annotated[str, Depends(client_ip)]
