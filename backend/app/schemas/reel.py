import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.post import PostAuthor


class ReelOut(BaseModel):
    """Matches what `Reels.ts` renders, with counts as numbers.

    The mock stored `likes: "12.5K"`. Abbreviation is a display concern — the API
    returns the real number so the client can format it for its locale (PRD 7.9).
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    author: PostAuthor
    video_url: str
    album_url: str | None = None
    caption: str | None = None

    likes_count: int = 0
    comments_count: int = 0
    views_count: int = 0

    created_at: datetime

    is_liked: bool = False
    is_mine: bool = False


class CreateReelRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    video_url: str | None = Field(default=None, max_length=1000)
    media_asset_id: uuid.UUID | None = None
    album_url: str | None = Field(default=None, max_length=1000)
    caption: str | None = Field(default=None, max_length=2200)

    @model_validator(mode="after")
    def _need_a_source(self) -> "CreateReelRequest":
        if not self.video_url and not self.media_asset_id:
            raise ValueError("provide either video_url or media_asset_id")
        return self

    @field_validator("video_url", "album_url")
    @classmethod
    def _http_only(cls, v: str | None) -> str | None:
        if v is None:
            return None
        if not v.startswith(("http://", "https://")):
            raise ValueError("must be an http or https URL")
        return v


class ReelLikeResponse(BaseModel):
    liked: bool
    likes_count: int


class PaginatedReels(BaseModel):
    items: list[ReelOut]
    next_cursor: str | None = None
    has_more: bool = False
