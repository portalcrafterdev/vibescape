import uuid
from typing import Annotated

from fastapi import APIRouter, Query, Response, status

from app.core.deps import CurrentUser, DbSession
from app.core.logging import get_logger
from app.models.post import Post
from app.models.user import User
from app.schemas.post import (
    AddPostTagRequest,
    CreatePostRequest,
    LikeResponse,
    PaginatedGrid,
    PaginatedPosts,
    PostAuthor,
    PostGridItem,
    PostOut,
    TaggedUser,
    UpdatePostRequest,
)
from app.services import hashtags as hashtag_service
from app.services import media as media_service
from app.services import mentions as mention_service
from app.services import posts as service
from app.services import tags as tag_service
from app.services import users as user_service

log = get_logger(__name__)
router = APIRouter(tags=["posts"])


def _to_out(
    post: Post,
    author: User,
    *,
    viewer_id: uuid.UUID,
    liked: bool,
    image_url: str | None = None,
    hashtags: list[str] | None = None,
    tagged: list[tuple[User, float | None, float | None]] | None = None,
    mentions: list[User] | None = None,
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
        hashtags=hashtags or [],
        tagged_users=[
            TaggedUser(
                id=user.id,
                username=user.username,
                display_name=user.display_name,
                avatar_url=user.avatar_url,
                x=x,
                y=y,
            )
            for user, x, y in (tagged or [])
        ],
        mentions=[PostAuthor.model_validate(user) for user in (mentions or [])],
        is_liked=liked,
        is_mine=post.author_id == viewer_id,
    )


async def _enrich(db, posts: list[Post]) -> tuple[dict, dict, dict]:
    """Hashtags, tagged people and mentions for a whole page.

    Three queries for the page, not three per post. A feed page carries up to 50
    posts, so doing this per row would be 150 round trips for one screen.
    """
    post_ids = [post.id for post in posts]
    return (
        await hashtag_service.for_posts(db, post_ids),
        await tag_service.for_posts(db, post_ids),
        await mention_service.for_posts(db, post_ids),
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
        tags, tagged, mentioned = await _enrich(db, [p for p, _ in rows])
        page = PaginatedPosts(
            items=[
                _to_out(
                    post,
                    author,
                    viewer_id=current_user.id,
                    liked=post.id in liked,
                    image_url=signed.get(post.id),
                    hashtags=tags.get(post.id),
                    tagged=tagged.get(post.id),
                    mentions=mentioned.get(post.id),
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
        hashtags=payload.hashtags,
        tagged_users=[(t.user_id, t.x, t.y) for t in payload.tagged_users or []],
    )
    signed = await media_service.signed_url(asset) if asset else None
    tags, tagged, mentioned = await _enrich(db, [post])
    return _to_out(
        post,
        current_user,
        viewer_id=current_user.id,
        liked=False,
        image_url=signed,
        hashtags=tags.get(post.id),
        tagged=tagged.get(post.id),
        mentions=mentioned.get(post.id),
    )


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
    tags, tagged, mentioned = await _enrich(db, [post])
    return _to_out(
        post,
        author,
        viewer_id=current_user.id,
        liked=post.id in liked,
        image_url=signed.get(post.id),
        hashtags=tags.get(post.id),
        tagged=tagged.get(post.id),
        mentions=mentioned.get(post.id),
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
        hashtags=payload.hashtags,
        tagged_users=(
            [(t.user_id, t.x, t.y) for t in payload.tagged_users]
            if payload.tagged_users is not None
            else None
        ),
    )
    liked = await service.liked_set(db, current_user.id, [post.id])
    tags, tagged, mentioned = await _enrich(db, [post])
    return _to_out(
        post,
        current_user,
        viewer_id=current_user.id,
        liked=post.id in liked,
        hashtags=tags.get(post.id),
        tagged=tagged.get(post.id),
        mentions=mentioned.get(post.id),
    )


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


@router.get("/users/{user_id}/tagged", response_model=PaginatedGrid)
async def list_tagged_posts(
    user_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
    cursor: str | None = None,
    limit: Annotated[
        int, Query(ge=1, le=tag_service.MAX_PAGE_SIZE)
    ] = tag_service.DEFAULT_PAGE_SIZE,
) -> PaginatedGrid:
    """Posts this user is tagged in — the third tab on a profile."""
    await user_service.get_by_id(db, user_id)
    rows, next_cursor, has_more = await tag_service.list_tagged_posts(
        db, user_id=user_id, cursor=cursor, limit=limit
    )
    return PaginatedGrid(
        items=[PostGridItem.model_validate(p) for p in rows],
        next_cursor=next_cursor,
        has_more=has_more,
    )


# ---------------------------------------------------------------- tagged people


@router.get("/posts/{post_id}/tags", response_model=list[TaggedUser])
async def list_post_tags(
    post_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
) -> list[TaggedUser]:
    """People tagged in a post."""
    await service.get_post(db, post_id)
    tagged = await tag_service.for_posts(db, [post_id])
    return [
        TaggedUser(
            id=user.id,
            username=user.username,
            display_name=user.display_name,
            avatar_url=user.avatar_url,
            x=x,
            y=y,
        )
        for user, x, y in tagged.get(post_id, [])
    ]


@router.post(
    "/posts/{post_id}/tags",
    response_model=list[TaggedUser],
    status_code=status.HTTP_201_CREATED,
)
async def add_post_tag(
    post_id: uuid.UUID,
    payload: AddPostTagRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> list[TaggedUser]:
    """Tag someone in your own post. Tagging them again moves their marker."""
    await tag_service.add(
        db,
        actor=current_user,
        post_id=post_id,
        user_id=payload.user_id,
        x=payload.x,
        y=payload.y,
    )
    return await list_post_tags(post_id, db, current_user)


@router.delete("/posts/{post_id}/tags/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_post_tag(
    post_id: uuid.UUID,
    user_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
) -> None:
    """Remove a tag.

    Allowed for the post's author and for the tagged person themselves — being
    tagged is something other people do to you, so you must be able to undo it.
    """
    await tag_service.remove(db, actor=current_user, post_id=post_id, user_id=user_id)


# ---------------------------------------------------------------- mentions


@router.get("/users/me/mentions", response_model=PaginatedPosts)
async def list_my_mentions(
    db: DbSession,
    current_user: CurrentUser,
    cursor: str | None = None,
    limit: Annotated[
        int, Query(ge=1, le=mention_service.MAX_PAGE_SIZE)
    ] = mention_service.DEFAULT_PAGE_SIZE,
) -> PaginatedPosts:
    """Posts whose caption mentions you, newest first."""
    rows, next_cursor, has_more = await mention_service.list_posts_mentioning(
        db, user_id=current_user.id, cursor=cursor, limit=limit
    )
    liked = await service.liked_set(db, current_user.id, [p.id for p, _ in rows])
    signed = await service.resolve_image_urls(db, [p for p, _ in rows])
    tags, tagged, mentioned = await _enrich(db, [p for p, _ in rows])

    return PaginatedPosts(
        items=[
            _to_out(
                post,
                author,
                viewer_id=current_user.id,
                liked=post.id in liked,
                image_url=signed.get(post.id),
                hashtags=tags.get(post.id),
                tagged=tagged.get(post.id),
                mentions=mentioned.get(post.id),
            )
            for post, author in rows
        ],
        next_cursor=next_cursor,
        has_more=has_more,
    )
