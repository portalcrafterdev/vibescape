from typing import Annotated

from fastapi import APIRouter, Query

from app.core.deps import CurrentUser, DbSession
from app.core.exceptions import NotFoundError
from app.schemas.post import HashtagOut, PaginatedGrid, PostGridItem
from app.services import hashtags as service

router = APIRouter(tags=["hashtags"])


@router.get("/hashtags/search", response_model=list[HashtagOut])
async def search_hashtags(
    db: DbSession,
    current_user: CurrentUser,
    q: Annotated[str, Query(min_length=1, max_length=100)],
    limit: Annotated[int, Query(ge=1, le=50)] = service.SEARCH_LIMIT,
) -> list[HashtagOut]:
    """Type-ahead over tags. Prefix match, most used first.

    Registered before `/hashtags/{tag}` so the literal path wins — otherwise
    "search" would be read as a tag name.
    """
    rows = await service.search(db, query=q, limit=limit)
    return [HashtagOut.model_validate(row) for row in rows]


@router.get("/hashtags/{tag}", response_model=HashtagOut)
async def read_hashtag(
    tag: str,
    db: DbSession,
    current_user: CurrentUser,
) -> HashtagOut:
    """One tag and how many posts carry it."""
    row = await service.get(db, tag)
    if row is None:
        raise NotFoundError("Hashtag not found")
    return HashtagOut.model_validate(row)


@router.get("/hashtags/{tag}/posts", response_model=PaginatedGrid)
async def list_hashtag_posts(
    tag: str,
    db: DbSession,
    current_user: CurrentUser,
    cursor: str | None = None,
    limit: Annotated[int, Query(ge=1, le=service.MAX_PAGE_SIZE)] = service.DEFAULT_PAGE_SIZE,
) -> PaginatedGrid:
    """Posts carrying a tag, newest first, as a grid.

    Returns an empty page rather than 404 for a tag nobody has used: a tag landing
    page reached by tapping text in a caption should show "nothing here", not an
    error.
    """
    rows, next_cursor, has_more = await service.list_posts(db, tag=tag, cursor=cursor, limit=limit)
    return PaginatedGrid(
        items=[PostGridItem.model_validate(post) for post in rows],
        next_cursor=next_cursor,
        has_more=has_more,
    )
