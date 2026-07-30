import re
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

_USERNAME_RE = re.compile(r"^[a-z0-9._]+$")


class UserPublic(BaseModel):
    """Everything an API response may contain about a user.

    Deliberately explicit rather than a dump of the ORM object — password_hash,
    failed_login_count and locked_until must never reach a client, and an allowlist
    keeps that true when new columns get added later.
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    display_name: str | None = None
    bio: str | None = None
    avatar_url: str | None = None
    banner_url: str | None = None
    gender: str | None = None
    created_at: datetime


class UserPrivate(UserPublic):
    """The authenticated user's own record. Adds only their own email."""

    email: EmailStr


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("username")
    @classmethod
    def _normalise_username(cls, v: str) -> str:
        v = v.strip().lower()
        if not _USERNAME_RE.match(v):
            raise ValueError("username may contain only letters, numbers, dots and underscores")
        if v.startswith(".") or v.endswith("."):
            raise ValueError("username may not start or end with a dot")
        return v

    @field_validator("email")
    @classmethod
    def _normalise_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("password")
    @classmethod
    def _password_strength(cls, v: str) -> str:
        # Length is the property that actually matters; a composition rule beyond this
        # mostly pushes people toward predictable substitutions.
        if v.strip() == "":
            raise ValueError("password must not be blank")
        return v


class LoginRequest(BaseModel):
    # Accepts either, so the client does not have to know which the user typed.
    identifier: str = Field(min_length=1, max_length=320, description="Username or email")
    password: str = Field(min_length=1, max_length=128)

    @field_validator("identifier")
    @classmethod
    def _normalise(cls, v: str) -> str:
        return v.strip().lower()


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=1, max_length=512)


class LogoutRequest(BaseModel):
    refresh_token: str | None = Field(default=None, max_length=512)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr

    @field_validator("email")
    @classmethod
    def _normalise(cls, v: str) -> str:
        return v.strip().lower()


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=1, max_length=512)
    new_password: str = Field(min_length=8, max_length=128)


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"  # noqa: S105 - OAuth token type, not a secret
    expires_in: int = Field(description="Access token lifetime in seconds")


class AuthResponse(BaseModel):
    user: UserPrivate
    tokens: TokenPair


class MessageResponse(BaseModel):
    message: str
