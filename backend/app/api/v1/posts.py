import uuid
from typing import Annotated

from fastapi import APIRouter, Query, Response, status

from app.core.deps import CurrentUser, DbSession
from app.core.logging import get_logger
from app.models.post import Post
from app.models.user import User
from app.schemas.post import (
    CreatePostRequest,
    LikeResponse,
    PaginatedGrid,
    PaginatedPosts,
    PostAuthor,
    PostGridItem,
    PostOut,
    UpdatePostRequest,
)
from app.services import media as media_service
from app.services import posts as service
from app.services import users as user_service

log = get_logger(__name__)
router = APIRouter(tags=["posts"])


def _to_out(
    post: Post, author: User, *, viewer_id: uuid.UUID, liked: bool, image_url: str | None = None
) -> PostOut:
    return PostOut(
        id=post.id,
        author=PostAuthor.model_validate(author),
        image_url=image_url or post.image_url or "",
        caption=post.caption,
        likes_count=post.likes_count,
        comments_count=post.comments_count,
        pinned=post.pinned,
        created_at=post.created_at,
        is_liked=liked,
        is_mine=post.author_id == viewer_id,
    )


# ---------------------------------------------------------------- feed


@router.get("/feed", response_model=PaginatedPosts)
async def read_feed(
    db: DbSession,
    current_user: CurrentUser,
    response: Response,
    cursor: str | None = None,
    limit: Annotated[int, Query(ge=1, le=service.MAX_PAGE_SIZE)] = service.DEFAULT_PAGE_SIZE,
) -> PaginatedPosts:
    """Posts from people you follow, plus your own. Newest first.

    Cached per viewer for a short window. Your own new posts appear immediately;
    someone else's may take up to the cache TTL to show.
    """

    async def build() -> dict:
        rows, next_cursor, has_more = await service.list_feed(
            db, viewer_id=current_user.id, cursor=cursor, limit=limit
        )
        liked = await service.liked_set(db, current_user.id, [p.id for p, _ in rows])
        signed = await service.resolve_image_urls(db, [p for p, _ in rows])
        page = PaginatedPosts(
            items=[
                _to_out(
                    post,
                    author,
                    viewer_id=current_user.id,
                    liked=post.id in liked,
                    image_url=signed.get(post.id),
                )
                for post, author in rows
            ],
            next_cursor=next_cursor,
            has_more=has_more,
        )
        return page.model_dump(mode="json")

    payload = await service.cached_feed_page(
        db, viewer_id=current_user.id, cursor=cursor, limit=limit, builder=build
    )
    response.headers["Cache-Control"] = "private, no-store"
    return PaginatedPosts.model_validate(payload)


# ---------------------------------------------------------------- posts


@router.post("/posts", response_model=PostOut, status_code=status.HTTP_201_CREATED)
async def create_post(
    payload: CreatePostRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> PostOut:
    asset = None
    if payload.media_asset_id:
        # Only a confirmed asset may be attached: an unverified key would let a
        # caller reference bytes nobody checked.
        asset = await media_service.get_ready_asset(
            db, owner=current_user, asset_id=payload.media_asset_id
        )

    post = await service.create_post(
        db,
        author=current_user,
        image_url=payload.image_url,
        caption=payload.caption,
        media_asset_id=asset.id if asset else None,
    )
    signed = await media_service.signed_url(asset) if asset else None
    return _to_out(post, current_user, viewer_id=current_user.id, liked=False, image_url=signed)


@router.get("/posts/{post_id}", response_model=PostOut)
async def read_post(
    post_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
) -> PostOut:
    post = await service.get_post(db, post_id)
    author = await user_service.get_by_id(db, post.author_id)
    liked = await service.liked_set(db, current_user.id, [post.id])
    signed = await service.resolve_image_urls(db, [post])
    return _to_out(
        post,
        author,
        viewer_id=current_user.id,
        liked=post.id in liked,
        image_url=signed.get(post.id),
    )


@router.patch("/posts/{post_id}", response_model=PostOut)
async def update_post(
    post_id: uuid.UUID,
    payload: UpdatePostRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> PostOut:
    """Edit your own post. Only fields present in the body change."""
    provided = payload.model_dump(exclude_unset=True)
    post = await service.update_post(
        db,
        actor=current_user,
        post_id=post_id,
        caption=provided.get("caption", ...),
        pinned=provided.get("pinned"),
    )
    liked = await service.liked_set(db, current_user.id, [post.id])
    return _to_out(post, current_user, viewer_id=current_user.id, liked=post.id in liked)


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
) -> None:
    """Delete your own post. Someone else's returns 403."""
    await service.delete_post(db, actor=current_user, post_id=post_id)


# ---------------------------------------------------------------- likes


@router.post("/posts/{post_id}/like", response_model=LikeResponse)
async def like_post(
    post_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
) -> LikeResponse:
    """Like a post. Idempotent."""
    liked, count = await service.like(db, user=current_user, post_id=post_id)
    return LikeResponse(liked=liked, likes_count=count)


@router.delete("/posts/{post_id}/like", response_model=LikeResponse)
async def unlike_post(
    post_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
) -> LikeResponse:
    """Remove a like. Idempotent."""
    liked, count = await service.unlike(db, user=current_user, post_id=post_id)
    return LikeResponse(liked=liked, likes_count=count)


# ---------------------------------------------------------------- profile grid


@router.get("/users/{user_id}/posts", response_model=PaginatedGrid)
async def list_user_posts(
    user_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
    cursor: str | None = None,
    limit: Annotated[int, Query(ge=1, le=service.MAX_PAGE_SIZE)] = service.DEFAULT_PAGE_SIZE,
) -> PaginatedGrid:
    """A user's posts as the profile grid — pinned first, then newest."""
    await user_service.get_by_id(db, user_id)
    rows, next_cursor, has_more = await service.list_by_author(
        db, author_id=user_id, cursor=cursor, limit=limit
    )
    return PaginatedGrid(
        items=[PostGridItem.model_validate(p) for p in rows],
        next_cursor=next_cursor,
        has_more=has_more,
    )
