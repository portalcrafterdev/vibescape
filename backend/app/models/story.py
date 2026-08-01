import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Story(Base):
    """A story, which stops being visible after its expiry.

    Expiry is a stored timestamp rather than a flag flipped by a job: a job that
    fails to run would leave stories visible past their lifetime, whereas a
    timestamp is correct whether or not anything is sweeping the table.
    """

    __tablename__ = "stories"
    __table_args__ = (
        # Every read filters on "mine or followed, not yet expired".
        Index("ix_stories_author_expires", "author_id", "expires_at"),
        Index("ix_stories_expires", "expires_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    author_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    image_url: Mapped[str | None] = mapped_column(String(1000))
    media_asset_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("media_assets.id", ondelete="SET NULL")
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class Highlight(Base):
    """A named, permanent collection of stories on a profile.

    Highlights are how a story outlives its expiry — the story row may vanish, but
    the highlight keeps its own copy of the image reference.
    """

    __tablename__ = "highlights"
    __table_args__ = (Index("ix_highlights_owner_position", "owner_id", "position"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    title: Mapped[str] = mapped_column(String(60), nullable=False)
    cover_url: Mapped[str | None] = mapped_column(String(1000))

    # Client-controlled ordering on the profile.
    position: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class HighlightItem(Base):
    __tablename__ = "highlight_items"
    __table_args__ = (Index("ix_highlight_items_highlight", "highlight_id", "position"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    highlight_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("highlights.id", ondelete="CASCADE"), nullable=False
    )

    # Copied rather than referenced: the story it came from expires, and a
    # highlight is meant to survive that.
    image_url: Mapped[str | None] = mapped_column(String(1000))
    media_asset_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("media_assets.id", ondelete="SET NULL")
    )

    position: Mapped[int] = mapped_column(Integer, default=0, server_default="0", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
