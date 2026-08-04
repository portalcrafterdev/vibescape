import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Comment(Base):
    """A comment on a post, or a reply to one.

    Deleting a post cascades its comments away at the database level rather than in
    application code, so an orphaned comment cannot outlive its post through a code
    path that forgot to clean up. A parent comment cascades to its replies the same
    way.
    """

    __tablename__ = "comments"
    __table_args__ = (
        # Serves the per-post listing in creation order without a separate sort.
        Index("ix_comments_post_created", "post_id", "created_at"),
        Index("ix_comments_author", "author_id"),
        # Serves the reply thread under one comment.
        Index("ix_comments_parent_created", "parent_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    post_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    # Null for a top-level comment. Threads are one level deep by design: a reply to
    # a reply is stored against the same top-level parent, which is what the client
    # can actually render. The service enforces that, not this column.
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("comments.id", ondelete="CASCADE")
    )

    # Only meaningful on a top-level comment — how many replies hang off it. Kept
    # denormalised so the comment list can render "View 3 replies" without a
    # COUNT(*) per row.
    replies_count: Mapped[int] = mapped_column(
        Integer, default=0, server_default="0", nullable=False
    )

    body: Mapped[str] = mapped_column(String(2200), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
