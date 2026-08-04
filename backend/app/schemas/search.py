from pydantic import BaseModel, Field

from app.schemas.post import HashtagOut
from app.schemas.user import UserSummary


class SearchResponse(BaseModel):
    """One call behind the single search box in the client.

    The design has one field, not a tabbed people/tags search, so making the client
    fan out to two endpoints and stitch the results would push work up for no gain.
    """

    users: list[UserSummary] = Field(default_factory=list)
    hashtags: list[HashtagOut] = Field(default_factory=list)
