import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.post import PostAuthor


class CommentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    post_id: uuid.UUID
    author: PostAuthor
    body: str
    created_at: datetime

    # Null on a top-level comment; the comment being replied to otherwise.
    parent_id: uuid.UUID | None = None

    # How many replies hang off this one. Always 0 on a reply, because threads are
    # one level deep.
    replies_count: int = 0

    # Resolved "@username" mentions in the body, so the client can linkify them
    # without re-parsing the text and disagreeing with what was stored.
    mentions: list[PostAuthor] = Field(default_factory=list)

    # True when the viewer may remove it: their own comment, or any comment on a
    # post they own.
    can_delete: bool = False


class CreateCommentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    body: str = Field(min_length=1, max_length=2200)

    # Set to reply to an existing comment. Replying to a reply attaches to that
    # reply's parent instead, so a thread never nests more than one level.
    parent_id: uuid.UUID | None = None

    @field_validator("body")
    @classmethod
    def _strip(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("comment must not be blank")
        return stripped


class CreateReplyRequest(BaseModel):
    """Body for POST /comments/{id}/replies — the parent comes from the path."""

    model_config = ConfigDict(extra="forbid")

    body: str = Field(min_length=1, max_length=2200)

    @field_validator("body")
    @classmethod
    def _strip(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("comment must not be blank")
        return stripped


class PaginatedComments(BaseModel):
    items: list[CommentOut]
    next_cursor: str | None = None
    has_more: bool = False
