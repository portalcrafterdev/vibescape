import secrets
from functools import lru_cache
from typing import Annotated, Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = True

    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "Vibescape API"

    # Serve the schema and docs pages. Separate from DEBUG so a shared staging box can
    # expose docs without also turning on debug behaviour. Defaults to DEBUG's value.
    ENABLE_DOCS: bool | None = None
    OPENAPI_URL: str = "/openapi.json"

    DATABASE_URL: str = "postgresql+asyncpg://localhost:5432/vibescape_dev"
    REDIS_URL: str = "redis://localhost:6379/1"

    # NoDecode stops pydantic-settings from JSON-parsing this before the validator
    # runs, so a plain comma-separated env value works.
    CORS_ORIGINS: Annotated[list[str], NoDecode] = Field(default_factory=list)

    SECRET_KEY: str = ""
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    MAX_REQUEST_BODY_BYTES: int = 10 * 1024 * 1024

    @field_validator("ENABLE_DOCS", mode="before")
    @classmethod
    def _blank_means_unset(cls, v: object) -> object:
        # An empty value in .env means "not configured", not "invalid boolean".
        # Without this, copying .env.example verbatim crashes the app at startup.
        if isinstance(v, str) and not v.strip():
            return None
        return v

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def _split_origins(cls, v: object) -> object:
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    @field_validator("DATABASE_URL")
    @classmethod
    def _require_async_driver(cls, v: str) -> str:
        # A sync driver silently blocks the event loop under load rather than failing
        # loudly, so reject it at startup instead.
        if not v.startswith("postgresql+asyncpg://"):
            raise ValueError("DATABASE_URL must use the postgresql+asyncpg:// driver")
        return v

    @model_validator(mode="after")
    def _validate_secrets(self) -> "Settings":
        if self.ENABLE_DOCS is None:
            self.ENABLE_DOCS = self.DEBUG

        if not self.SECRET_KEY:
            if self.ENVIRONMENT == "production":
                raise ValueError("SECRET_KEY must be set in production")
            # Ephemeral per-process key for local dev. Restarting invalidates tokens,
            # which is the correct tradeoff versus shipping a hardcoded default that
            # could reach production.
            self.SECRET_KEY = secrets.token_urlsafe(64)

        if self.ENVIRONMENT == "production":
            if self.DEBUG:
                raise ValueError("DEBUG must be false in production")
            if "*" in self.CORS_ORIGINS:
                raise ValueError("CORS_ORIGINS must not be '*' in production")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
