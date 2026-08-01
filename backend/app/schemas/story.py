import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.post import PostAuthor


class StoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    author: PostAuthor
    image_url: str
    created_at: datetime
    expires_at: datetime

    # `stories.ts` marks the viewer's own entry with isMe so it renders first.
    is_mine: bool = False


class StoryTray(BaseModel):
    """One row per author, which is how the tray is actually drawn.

    A flat list of stories would make the client group them; the mock shows one
    circle per person, so the grouping belongs here.
    """

    author: PostAuthor
    is_mine: bool = False
    story_count: int = 0
    latest_at: datetime
    preview_url: str | None = None


class CreateStoryRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    image_url: str | None = Field(default=None, max_length=1000)
    media_asset_id: uuid.UUID | None = None

    @model_validator(mode="after")
    def _need_a_source(self) -> "CreateStoryRequest":
        if not self.image_url and not self.media_asset_id:
            raise ValueError("provide either image_url or media_asset_id")
        return self

    @field_validator("image_url")
    @classmethod
    def _http_only(cls, v: str | None) -> str | None:
        if v is None:
            return None
        if not v.startswith(("http://", "https://")):
            raise ValueError("image_url must be an http or https URL")
        return v


class HighlightItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    image_url: str | None = None
    position: int = 0


class HighlightOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    cover_url: str | None = None
    position: int = 0
    item_count: int = 0


class CreateHighlightRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=60)
    cover_url: str | None = Field(default=None, max_length=1000)
    # Stories to seed it with. They are copied, so the highlight survives their expiry.
    story_ids: list[uuid.UUID] = Field(default_factory=list, max_length=100)

    @field_validator("title")
    @classmethod
    def _strip(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("title must not be blank")
        return stripped
