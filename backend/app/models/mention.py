import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Mention(Base):
    """A resolved `@username` inside a post caption or a comment body.

    One table for both targets rather than two near-identical ones: every read is
    "who was mentioned here" or "where was this person mentioned", and a single table
    answers both without a UNION.

    Only mentions that resolved to a real account are stored. `@notauser` stays plain
    text — recording unresolved handles would fill the table with typos and let a
    caption invent rows for names that were never accounts.
    """

    __tablename__ = "mentions"
    __table_args__ = (
        # Exactly one target. Without this a row could point at both a post and a
        # comment, or at neither, and every reader would have to guess.
        CheckConstraint(
            "(post_id IS NOT NULL AND comment_id IS NULL)"
            " OR (post_id IS NULL AND comment_id IS NOT NULL)",
            name="ck_mention_one_target",
        ),
        # Partial uniques: naming someone twice in one caption is one mention.
        Index(
            "uq_mention_post",
            "user_id",
            "post_id",
            unique=True,
            postgresql_where=text("post_id IS NOT NULL"),
        ),
        Index(
            "uq_mention_comment",
            "user_id",
            "comment_id",
            unique=True,
            postgresql_where=text("comment_id IS NOT NULL"),
        ),
        # "Posts that mention me", newest first.
        Index("ix_mentions_user_created", "user_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    post_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE")
    )
    comment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("comments.id", ondelete="CASCADE")
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
