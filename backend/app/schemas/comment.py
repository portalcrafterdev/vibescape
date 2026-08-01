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

    # True when the viewer may remove it: their own comment, or any comment on a
    # post they own.
    can_delete: bool = False


class CreateCommentRequest(BaseModel):
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
