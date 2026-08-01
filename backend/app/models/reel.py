import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Reel(Base):
    """A short video.

    Kept separate from Post rather than adding a media type to it. They are
    surfaced by different endpoints with different ordering, and a shared table
    would mean every feed query filtering on a discriminator forever.
    """

    __tablename__ = "reels"
    __table_args__ = (
        Index("ix_reels_author_created", "author_id", "created_at"),
        Index("ix_reels_created", "created_at"),
        # Explore ranks by view count; this keeps that ordering off a sequential scan.
        Index("ix_reels_views", "views_count"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    # `Reels.ts` nests the source as `video: { uri }` for react-native-video; the API
    # returns a flat URL and the client shapes it.
    video_url: Mapped[str | None] = mapped_column(String(1000))
    media_asset_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("media_assets.id", ondelete="SET NULL")
    )

    # Audio/album thumbnail shown over the video.
    album_url: Mapped[str | None] = mapped_column(String(1000))
    caption: Mapped[str | None] = mapped_column(String(2200))

    likes_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    comments_count: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )
    views_count: Mapped[int] = mapped_column(
        BigInteger, default=0, server_default="0", nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class ReelLike(Base):
    __tablename__ = "reel_likes"
    __table_args__ = (
        UniqueConstraint("reel_id", "user_id", name="uq_reel_like"),
        Index("ix_reel_likes_user", "user_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reel_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("reels.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
