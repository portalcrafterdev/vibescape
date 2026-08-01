import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Post(Base):
    __tablename__ = "posts"
    __table_args__ = (
        # The feed reads a window of an author's posts ordered by recency; this index
        # serves both the profile grid and the fan-out feed query.
        Index("ix_posts_author_created", "author_id", "created_at"),
        Index("ix_posts_created", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    # Either a caller-supplied external URL, or a reference to a verified upload.
    # A signed URL is never stored: it expires, so it is generated at read time.
    image_url: Mapped[str | None] = mapped_column(String(1000))
    media_asset_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("media_assets.id", ondelete="SET NULL")
    )
    caption: Mapped[str | None] = mapped_column(String(2200))

    # Denormalised for the same reason as the follow counters: rendering a feed page
    # should not mean a COUNT(*) per post. Kept honest by the unique constraint on
    # PostLike, which makes a duplicate like fail rather than double-increment.
    likes_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    comments_count: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )

    # Profile grid ordering — pinned posts float to the top.
    pinned: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    author: Mapped["User"] = relationship(lazy="raise")  # noqa: F821


class PostLike(Base):
    """One like. The unique pair is what keeps likes_count accurate."""

    __tablename__ = "post_likes"
    __table_args__ = (
        UniqueConstraint("post_id", "user_id", name="uq_post_like"),
        Index("ix_post_likes_user", "user_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    post_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
