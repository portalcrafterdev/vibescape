import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.core.text import MAX_HASHTAGS, normalise_hashtag

MAX_TAGGED_USERS = 20


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


class TaggedUser(PostAuthor):
    """Someone tagged in the picture, with where the tag sits on it.

    x and y are 0..1 fractions of width and height, not pixels — the client renders
    the same image at whatever size the device gives it. Null when the tag was added
    without a position.
    """

    x: float | None = None
    y: float | None = None


class PostTagInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: uuid.UUID
    x: float | None = Field(default=None, ge=0, le=1)
    y: float | None = Field(default=None, ge=0, le=1)


class PostOut(BaseModel):
    """A feed post.

    `created_at` is ISO-8601 rather than the mock's pre-formatted "2 hours ago"
    (PRD 7.8): relative time depends on when it is read, not when it was sent, and
    a cached string goes stale immediately. Counts are numbers, per PRD 7.9.
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    author: PostAuthor
    image_url: str | None = None
    caption: str | None = None
    likes_count: int = 0
    comments_count: int = 0
    pinned: bool = False
    created_at: datetime

    # Tags found in the caption, without the leading "#", so the client can linkify
    # the text without re-parsing it and disagreeing with what was stored.
    hashtags: list[str] = Field(default_factory=list)

    # People attached to the picture.
    tagged_users: list[TaggedUser] = Field(default_factory=list)

    # Resolved "@username" mentions in the caption. Only real accounts appear here;
    # an unresolved handle stays plain text.
    mentions: list[PostAuthor] = Field(default_factory=list)

    # Relative to the requesting user.
    is_liked: bool = False
    is_mine: bool = False


class PostGridItem(BaseModel):
    """Profile-grid projection — matches `ProfilePosts.ts` (id, image, pinned)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    image_url: str | None = None
    pinned: bool = False
    likes_count: int = 0
    comments_count: int = 0


class CreatePostRequest(BaseModel):
    """Either an external image_url or a media_asset_id from a confirmed upload.

    media_asset_id is the real path: those bytes have been verified. image_url is
    kept for development and for referencing images already hosted elsewhere.
    """

    model_config = ConfigDict(extra="forbid")

    image_url: str | None = Field(default=None, max_length=1000)
    media_asset_id: uuid.UUID | None = None
    caption: str | None = Field(default=None, max_length=2200)

    # Optional. Tags in the caption are picked up automatically, so this is only
    # needed when the composer collects them in a separate field. The two are merged.
    hashtags: list[str] | None = Field(default=None, max_length=MAX_HASHTAGS)

    tagged_users: list[PostTagInput] | None = Field(default=None, max_length=MAX_TAGGED_USERS)

    @model_validator(mode="after")
    def _need_one_source(self) -> "CreatePostRequest":
        if not self.image_url and not self.media_asset_id:
            raise ValueError("provide either image_url or media_asset_id")
        return self

    @field_validator("hashtags")
    @classmethod
    def _clean_hashtags(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return None
        # Accepts "#Travel" or "travel" and stores "travel", so the composer does not
        # have to care which form it collected.
        return [normalise_hashtag(tag) for tag in v]

    @field_validator("tagged_users")
    @classmethod
    def _unique_tags(cls, v: list[PostTagInput] | None) -> list[PostTagInput] | None:
        if v is None:
            return None
        seen: set[uuid.UUID] = set()
        unique: list[PostTagInput] = []
        for tag in v:
            if tag.user_id not in seen:
                seen.add(tag.user_id)
                unique.append(tag)
        return unique

    @field_validator("image_url")
    @classmethod
    def _http_only(cls, v: str | None) -> str | None:
        if v is None:
            return None
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

    # Sending hashtags replaces the post's whole set. Sending a caption without them
    # re-derives the set from the new text, so an edited caption cannot keep tags it
    # no longer contains.
    hashtags: list[str] | None = Field(default=None, max_length=MAX_HASHTAGS)

    tagged_users: list[PostTagInput] | None = Field(default=None, max_length=MAX_TAGGED_USERS)

    @field_validator("hashtags")
    @classmethod
    def _clean_hashtags(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return None
        return [normalise_hashtag(tag) for tag in v]

    @field_validator("tagged_users")
    @classmethod
    def _unique_tags(cls, v: list[PostTagInput] | None) -> list[PostTagInput] | None:
        if v is None:
            return None
        seen: set[uuid.UUID] = set()
        unique: list[PostTagInput] = []
        for tag in v:
            if tag.user_id not in seen:
                seen.add(tag.user_id)
                unique.append(tag)
        return unique


class LikeResponse(BaseModel):
    liked: bool
    likes_count: int


class HashtagOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tag: str
    posts_count: int = 0


class AddPostTagRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: uuid.UUID
    x: float | None = Field(default=None, ge=0, le=1)
    y: float | None = Field(default=None, ge=0, le=1)


class PaginatedPosts(BaseModel):
    items: list[PostOut]
    next_cursor: str | None = None
    has_more: bool = False


class PaginatedGrid(BaseModel):
    items: list[PostGridItem]
    next_cursor: str | None = None
    has_more: bool = False
