import uuid
from typing import Annotated

from fastapi import APIRouter, Query, status

from app.core.deps import CurrentUser, DbSession
from app.core.exceptions import NotFoundError
from app.models.comment import Comment
from app.models.user import User
from app.schemas.comment import (
    CommentOut,
    CreateCommentRequest,
    CreateReplyRequest,
    PaginatedComments,
)
from app.schemas.post import PostAuthor
from app.services import comments as service
from app.services import mentions as mention_service
from app.services import posts as post_service

router = APIRouter(tags=["comments"])


def _to_out(
    comment: Comment,
    author: User,
    *,
    can_delete: bool,
    mentions: list[User] | None = None,
) -> CommentOut:
    return CommentOut(
        id=comment.id,
        post_id=comment.post_id,
        author=PostAuthor.model_validate(author),
        body=comment.body,
        created_at=comment.created_at,
        parent_id=comment.parent_id,
        replies_count=comment.replies_count,
        mentions=[PostAuthor.model_validate(user) for user in (mentions or [])],
        can_delete=can_delete,
    )


async def _page_out(
    db, rows, post, viewer_id: uuid.UUID, next_cursor: str | None, has_more: bool
) -> PaginatedComments:
    """Render a page of comments, resolving mentions for the whole page at once."""
    mentioned = await mention_service.for_comments(db, [c.id for c, _ in rows])

    return PaginatedComments(
        items=[
            _to_out(
                comment,
                author,
                can_delete=service.can_delete(comment, post, viewer_id),
                mentions=mentioned.get(comment.id),
            )
            for comment, author in rows
        ],
        next_cursor=next_cursor,
        has_more=has_more,
    )


@router.post(
    "/posts/{post_id}/comments",
    response_model=CommentOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_comment(
    post_id: uuid.UUID,
    payload: CreateCommentRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> CommentOut:
    """Comment on a post, or reply to a comment by sending `parent_id`."""
    comment, _count, mentioned = await service.create(
        db,
        author=current_user,
        post_id=post_id,
        body=payload.body,
        parent_id=payload.parent_id,
    )
    return _to_out(comment, current_user, can_delete=True, mentions=mentioned)


@router.get("/posts/{post_id}/comments", response_model=PaginatedComments)
async def list_comments(
    post_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
    cursor: str | None = None,
    limit: Annotated[int, Query(ge=1, le=service.MAX_PAGE_SIZE)] = service.DEFAULT_PAGE_SIZE,
) -> PaginatedComments:
    """Top-level comments on a post, oldest first.

    Replies are not interleaved here — each carries a `replies_count`, and the
    thread is fetched from `/comments/{id}/replies`. Mixing them in would let one
    busy thread push every other comment off the first page.
    """
    post = await post_service.get_post(db, post_id)
    rows, next_cursor, has_more = await service.list_for_post(
        db, post_id=post_id, cursor=cursor, limit=limit
    )
    return await _page_out(db, rows, post, current_user.id, next_cursor, has_more)


@router.post(
    "/comments/{comment_id}/replies",
    response_model=CommentOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_reply(
    comment_id: uuid.UUID,
    payload: CreateReplyRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> CommentOut:
    """Reply to a comment.

    Threads stay one level deep: replying to a reply attaches to the same top-level
    comment rather than nesting further.
    """
    parent = await db.get(Comment, comment_id)
    if parent is None:
        raise NotFoundError("Comment not found")

    comment, _count, mentioned = await service.create(
        db,
        author=current_user,
        post_id=parent.post_id,
        body=payload.body,
        parent_id=comment_id,
    )
    return _to_out(comment, current_user, can_delete=True, mentions=mentioned)


@router.get("/comments/{comment_id}/replies", response_model=PaginatedComments)
async def list_replies(
    comment_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
    cursor: str | None = None,
    limit: Annotated[int, Query(ge=1, le=service.MAX_PAGE_SIZE)] = service.DEFAULT_PAGE_SIZE,
) -> PaginatedComments:
    """Replies under one comment, oldest first."""
    rows, next_cursor, has_more = await service.list_replies(
        db, parent_id=comment_id, cursor=cursor, limit=limit
    )

    parent = await db.get(Comment, comment_id)
    post = await post_service.get_post(db, parent.post_id)  # type: ignore[union-attr]
    return await _page_out(db, rows, post, current_user.id, next_cursor, has_more)


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
) -> None:
    """Delete a comment.

    Allowed for the comment's author, and for the owner of the post it is on so they
    can moderate their own content. Anyone else gets 403.

    Deleting a top-level comment takes its replies with it.
    """
    await service.delete(db, actor=current_user, comment_id=comment_id)
