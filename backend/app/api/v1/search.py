from typing import Annotated

from fastapi import APIRouter, Query

from app.core.deps import CurrentUser, DbSession
from app.schemas.post import HashtagOut
from app.schemas.search import SearchResponse
from app.schemas.user import UserSummary
from app.services import hashtags as hashtag_service
from app.services import users as user_service

router = APIRouter(tags=["search"])


@router.get("/search", response_model=SearchResponse)
async def search(
    db: DbSession,
    current_user: CurrentUser,
    q: Annotated[str, Query(min_length=1, max_length=60)],
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
) -> SearchResponse:
    """People and hashtags matching one query.

    The client has a single search box, so one call backs it rather than making the
    screen fan out to two endpoints and stitch the results together.

    A leading "#" narrows the search to tags — that is what typing one means.
    """
    term = q.strip()
    tags_only = term.startswith("#")

    users = [] if tags_only else await user_service.search(db, query=term, limit=limit)
    hashtags = await hashtag_service.search(db, query=term, limit=limit)

    return SearchResponse(
        users=[UserSummary.model_validate(user) for user in users],
        hashtags=[HashtagOut.model_validate(tag) for tag in hashtags],
    )
