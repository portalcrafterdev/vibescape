import re
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator

_USERNAME_RE = re.compile(r"^[a-z0-9._]+$")
MAX_LINKS = 5


class ProfileLink(BaseModel):
    title: str = Field(min_length=1, max_length=60)
    url: HttpUrl

    @field_validator("url")
    @classmethod
    def _https_only(cls, v: HttpUrl) -> HttpUrl:
        # A profile link is rendered as a tappable URL for other people. Allowing
        # arbitrary schemes turns that into a way to fire javascript: or app deep
        # links from someone else's profile.
        if v.scheme not in {"http", "https"}:
            raise ValueError("link must be http or https")
        return v


class UserSummary(BaseModel):
    """Compact shape for lists — followers, following, search results.

    No email: this is other people's data.
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    display_name: str | None = None
    avatar_url: str | None = None
    is_following: bool = False


class UserProfile(BaseModel):
    """A profile as seen by anyone.

    An explicit allowlist rather than an ORM dump. email, password_hash,
    failed_login_count and locked_until are absent by construction, so adding a
    column later cannot silently expose it.
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    display_name: str | None = None
    bio: str | None = None
    pronouns: str | None = None
    avatar_url: str | None = None
    banner_url: str | None = None
    gender: str | None = None
    links: list[dict] = Field(default_factory=list)

    followers_count: int = 0
    following_count: int = 0
    posts_count: int = 0

    created_at: datetime

    # Relationship to the viewer. False when unauthenticated or viewing yourself.
    is_following: bool = False
    is_self: bool = False


class OwnProfile(UserProfile):
    """The authenticated user's own profile. Adds their own email, nothing more."""

    email: str


class UpdateProfileRequest(BaseModel):
    """Every field optional — a PATCH updates only what it sends.

    None and "absent" mean different things here: absent leaves a field alone,
    while an explicit null clears it. model_fields_set distinguishes them.
    """

    model_config = ConfigDict(extra="forbid")

    username: str | None = Field(default=None, min_length=3, max_length=30)
    display_name: str | None = Field(default=None, max_length=60)
    bio: str | None = Field(default=None, max_length=500)
    pronouns: str | None = Field(default=None, max_length=40)
    gender: str | None = Field(default=None, max_length=40)
    avatar_url: str | None = Field(default=None, max_length=1000)
    banner_url: str | None = Field(default=None, max_length=1000)
    links: list[ProfileLink] | None = Field(default=None, max_length=MAX_LINKS)

    @field_validator("username")
    @classmethod
    def _normalise_username(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = v.strip().lower()
        if not _USERNAME_RE.match(v):
            raise ValueError("username may contain only letters, numbers, dots and underscores")
        if v.startswith(".") or v.endswith("."):
            raise ValueError("username may not start or end with a dot")
        return v

    @field_validator("display_name", "bio", "pronouns", "gender")
    @classmethod
    def _strip(cls, v: str | None) -> str | None:
        if v is None:
            return None
        stripped = v.strip()
        return stripped or None


class FollowResponse(BaseModel):
    following: bool
    followers_count: int


class PaginatedUsers(BaseModel):
    items: list[UserSummary]
    next_cursor: str | None = None
    has_more: bool = False
