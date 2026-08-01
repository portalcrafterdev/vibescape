import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Comment(Base):
    """A comment on a post.

    Deleting a post cascades its comments away at the database level rather than in
    application code, so an orphaned comment cannot outlive its post through a code
    path that forgot to clean up.
    """

    __tablename__ = "comments"
    __table_args__ = (
        # Serves the per-post listing in creation order without a separate sort.
        Index("ix_comments_post_created", "post_id", "created_at"),
        Index("ix_comments_author", "author_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    post_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"), nullable=False
    )
    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    body: Mapped[str] = mapped_column(String(2200), nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
