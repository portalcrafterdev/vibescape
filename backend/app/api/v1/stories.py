import uuid

from fastapi import APIRouter, status

from app.core.deps import CurrentUser, DbSession
from app.schemas.post import PostAuthor
from app.schemas.story import (
    CreateHighlightRequest,
    CreateStoryRequest,
    HighlightItemOut,
    HighlightOut,
    StoryOut,
    StoryTray,
)
from app.services import media as media_service
from app.services import stories as service
from app.services import users as user_service

router = APIRouter(tags=["stories"])


@router.get("/stories", response_model=list[StoryTray])
async def story_tray(db: DbSession, current_user: CurrentUser) -> list[StoryTray]:
    """The story tray: one entry per author with unexpired stories.

    Grouped by author because that is how the row is drawn — a flat list would push
    the grouping onto every client. Your own entry comes first.
    """
    trays = await service.active_tray(db, viewer_id=current_user.id)
    return [
        StoryTray(
            author=PostAuthor.model_validate(t["author"]),
            is_mine=t["is_mine"],
            story_count=t["story_count"],
            latest_at=t["latest_at"],
            preview_url=t["preview"].image_url if t["preview"] else None,
        )
        for t in trays
    ]


@router.post("/stories", response_model=StoryOut, status_code=status.HTTP_201_CREATED)
async def create_story(
    payload: CreateStoryRequest, db: DbSession, current_user: CurrentUser
) -> StoryOut:
    """Post a story. It stops being visible after 24 hours."""
    asset = None
    if payload.media_asset_id:
        asset = await media_service.get_ready_asset(
            db, owner=current_user, asset_id=payload.media_asset_id
        )

    story = await service.create_story(
        db,
        author=current_user,
        image_url=payload.image_url,
        media_asset_id=asset.id if asset else None,
    )
    image = await media_service.signed_url(asset) if asset else (payload.image_url or "")

    return StoryOut(
        id=story.id,
        author=PostAuthor.model_validate(current_user),
        image_url=image,
        created_at=story.created_at,
        expires_at=story.expires_at,
        is_mine=True,
    )


@router.get("/users/{user_id}/stories", response_model=list[StoryOut])
async def user_stories(
    user_id: uuid.UUID, db: DbSession, current_user: CurrentUser
) -> list[StoryOut]:
    """An author's unexpired stories, oldest first. Expired ones are never returned."""
    author = await user_service.get_by_id(db, user_id)
    stories = await service.list_for_author(db, author_id=user_id, viewer_id=current_user.id)

    return [
        StoryOut(
            id=s.id,
            author=PostAuthor.model_validate(author),
            image_url=s.image_url or "",
            created_at=s.created_at,
            expires_at=s.expires_at,
            is_mine=s.author_id == current_user.id,
        )
        for s in stories
    ]


@router.delete("/stories/{story_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_story(story_id: uuid.UUID, db: DbSession, current_user: CurrentUser) -> None:
    await service.delete_story(db, actor=current_user, story_id=story_id)


# ---------------------------------------------------------------- highlights


@router.get("/users/{user_id}/highlights", response_model=list[HighlightOut])
async def list_highlights(
    user_id: uuid.UUID, db: DbSession, current_user: CurrentUser
) -> list[HighlightOut]:
    await user_service.get_by_id(db, user_id)
    rows = await service.list_highlights(db, owner_id=user_id)
    return [
        HighlightOut(
            id=h.id,
            title=h.title,
            cover_url=h.cover_url,
            position=h.position,
            item_count=count,
        )
        for h, count in rows
    ]


@router.post("/highlights", response_model=HighlightOut, status_code=status.HTTP_201_CREATED)
async def create_highlight(
    payload: CreateHighlightRequest, db: DbSession, current_user: CurrentUser
) -> HighlightOut:
    """Save stories into a permanent highlight.

    Images are copied, not linked — a highlight exists to outlive the stories in
    it, so referencing rows that expire would leave it empty.
    """
    highlight = await service.create_highlight(
        db,
        owner=current_user,
        title=payload.title,
        cover_url=payload.cover_url,
        story_ids=payload.story_ids,
    )
    items = await service.list_highlight_items(db, highlight_id=highlight.id)
    return HighlightOut(
        id=highlight.id,
        title=highlight.title,
        cover_url=highlight.cover_url,
        position=highlight.position,
        item_count=len(items),
    )


@router.get("/highlights/{highlight_id}/items", response_model=list[HighlightItemOut])
async def highlight_items(
    highlight_id: uuid.UUID, db: DbSession, current_user: CurrentUser
) -> list[HighlightItemOut]:
    items = await service.list_highlight_items(db, highlight_id=highlight_id)
    return [HighlightItemOut.model_validate(i) for i in items]


@router.delete("/highlights/{highlight_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_highlight(
    highlight_id: uuid.UUID, db: DbSession, current_user: CurrentUser
) -> None:
    await service.delete_highlight(db, actor=current_user, highlight_id=highlight_id)
