import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    # Random UUIDs rather than sequential integers: sequential public ids are
    # enumerable and leak how many users exist (PRD 7.5).
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Stored lowercased so uniqueness is case-insensitive. Postgres would otherwise
    # happily hold both "Chetan" and "chetan" as distinct accounts.
    username: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)

    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    display_name: Mapped[str | None] = mapped_column(String(60))
    bio: Mapped[str | None] = mapped_column(String(500))
    avatar_url: Mapped[str | None] = mapped_column(String(1000))
    banner_url: Mapped[str | None] = mapped_column(String(1000))
    gender: Mapped[str | None] = mapped_column(String(40))
    pronouns: Mapped[str | None] = mapped_column(String(40))

    # Free-form profile links. JSONB rather than a side table because they are only
    # ever read and written as a whole list, never queried individually.
    links: Mapped[list[dict]] = mapped_column(
        JSONB, default=list, server_default="[]", nullable=False
    )

    # Denormalised so a profile render is one row rather than two COUNT(*) scans over
    # a table that grows without bound. Kept correct by updating them in the same
    # transaction as the follow edge, guarded by its unique constraint.
    followers_count: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )
    following_count: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )
    posts_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Brute-force throttling. locked_until is authoritative; the counter only drives
    # how long the next lock lasts.
    failed_login_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(  # noqa: F821
        back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"<User {self.username}>"
