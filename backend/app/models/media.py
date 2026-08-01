import enum
import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class MediaStatus(enum.StrEnum):
    # Upload URL issued, bytes not yet verified. Unusable until confirmed.
    PENDING = "pending"
    # Bytes present and their signature matched a format we accept.
    READY = "ready"


class MediaAsset(Base):
    """A stored object and its verification state.

    The row is created when an upload URL is issued, before any bytes exist, so
    something has to distinguish "we handed out a URL" from "a real image arrived".
    Only READY assets may be attached to a post — otherwise a caller could request a
    URL, upload nothing, and still reference the key.
    """

    __tablename__ = "media_assets"
    __table_args__ = (Index("ix_media_owner_created", "owner_id", "created_at"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    storage_key: Mapped[str] = mapped_column(String(500), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default=MediaStatus.PENDING, nullable=False)

    # Recorded from the bytes themselves at confirm time, not from what the client
    # declared when asking for the URL.
    content_type: Mapped[str | None] = mapped_column(String(100))
    size_bytes: Mapped[int | None] = mapped_column(BigInteger)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
