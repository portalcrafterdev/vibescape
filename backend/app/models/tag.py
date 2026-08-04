import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Index, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PostTag(Base):
    """A person tagged in a post.

    Distinct from a mention: a mention is `@name` written in the caption text, while
    this is someone attached to the picture itself, optionally at a point on it.
    """

    __tablename__ = "post_tags"
    __table_args__ = (
        # Tagging the same person twice is a no-op rather than a second row.
        UniqueConstraint("post_id", "user_id", name="uq_post_tag"),
        # Serves the "tagged" tab on a profile.
        Index("ix_post_tags_user", "user_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    post_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    # Where the tag sits on the image, as a 0..1 fraction of width and height.
    # Fractions rather than pixels, because the client renders the same picture at
    # whatever size the device gives it. Null when the tag has no placement.
    x: Mapped[float | None] = mapped_column(Float)
    y: Mapped[float | None] = mapped_column(Float)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
