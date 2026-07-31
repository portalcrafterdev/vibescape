import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PostAuthor(BaseModel):
    """Denormalised author, matching what the feed card already renders.

    `Posts.ts` reads `username` and `profileImage` straight off each post rather than
    joining, so the payload carries them inline.
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    display_name: str | None = None
    avatar_url: str | None = None


class PostOut(BaseModel):
    """A feed post.

    `created_at` is ISO-8601 rather than the mock's pre-formatted "2 hours ago"
    (PRD 7.8): relative time depends on when it is read, not when it was sent, and
    a cached string goes stale immediately. Counts are numbers, per PRD 7.9.
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    author: PostAuthor
    image_url: str
    caption: str | None = None
    likes_count: int = 0
    comments_count: int = 0
    pinned: bool = False
    created_at: datetime

    # Relative to the requesting user.
    is_liked: bool = False
    is_mine: bool = False


class PostGridItem(BaseModel):
    """Profile-grid projection — matches `ProfilePosts.ts` (id, image, pinned)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    image_url: str
    pinned: bool = False
    likes_count: int = 0
    comments_count: int = 0


class CreatePostRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    image_url: str = Field(min_length=1, max_length=1000)
    caption: str | None = Field(default=None, max_length=2200)

    @field_validator("image_url")
    @classmethod
    def _http_only(cls, v: str) -> str:
        # Rendered as an image source in other people's feeds; anything but http(s)
        # is a way to point a URL loader somewhere it should not go.
        if not v.startswith(("http://", "https://")):
            raise ValueError("image_url must be an http or https URL")
        return v

    @field_validator("caption")
    @classmethod
    def _strip(cls, v: str | None) -> str | None:
        if v is None:
            return None
        return v.strip() or None


class UpdatePostRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    caption: str | None = Field(default=None, max_length=2200)
    pinned: bool | None = None


class LikeResponse(BaseModel):
    liked: bool
    likes_count: int


class PaginatedPosts(BaseModel):
    items: list[PostOut]
    next_cursor: str | None = None
    has_more: bool = False


class PaginatedGrid(BaseModel):
    items: list[PostGridItem]
    next_cursor: str | None = None
    has_more: bool = False
