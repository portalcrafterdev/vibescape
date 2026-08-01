import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.post import PostAuthor


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    conversation_id: uuid.UUID
    sender: PostAuthor
    body: str
    created_at: datetime
    is_mine: bool = False


class ConversationRow(BaseModel):
    """The conversation list row, shaped like `MessageData.ts`.

    That mock carries `username`, `message`, `time`, `unread`, `online` and `image`
    — a thread summary, not a message. This is the same idea with real types:
    `unread` is a count rather than a boolean so a badge can show a number, and
    `time` is ISO-8601 rather than "now".
    """

    id: uuid.UUID
    other: PostAuthor
    last_message: str | None = None
    last_message_at: datetime | None = None
    unread_count: int = 0
    online: bool = False


class SendMessageRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    body: str = Field(min_length=1, max_length=4000)

    @field_validator("body")
    @classmethod
    def _strip(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("message must not be blank")
        return stripped


class StartConversationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: uuid.UUID


class ConversationOut(BaseModel):
    id: uuid.UUID
    participants: list[PostAuthor]
    created_at: datetime


class PaginatedMessages(BaseModel):
    items: list[MessageOut]
    next_cursor: str | None = None
    has_more: bool = False


class UnreadTotal(BaseModel):
    unread_total: int
