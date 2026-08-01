import uuid
from typing import Annotated

from fastapi import APIRouter, Query, status

from app.core.deps import CurrentUser, DbSession
from app.models.comment import Comment
from app.models.user import User
from app.schemas.comment import CommentOut, CreateCommentRequest, PaginatedComments
from app.schemas.post import PostAuthor
from app.services import comments as service
from app.services import posts as post_service

router = APIRouter(tags=["comments"])


def _to_out(comment: Comment, author: User, *, can_delete: bool) -> CommentOut:
    return CommentOut(
        id=comment.id,
        post_id=comment.post_id,
        author=PostAuthor.model_validate(author),
        body=comment.body,
        created_at=comment.created_at,
        can_delete=can_delete,
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
    """Comment on a post."""
    comment, _count = await service.create(
        db, author=current_user, post_id=post_id, body=payload.body
    )
    return _to_out(comment, current_user, can_delete=True)


@router.get("/posts/{post_id}/comments", response_model=PaginatedComments)
async def list_comments(
    post_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
    cursor: str | None = None,
    limit: Annotated[int, Query(ge=1, le=service.MAX_PAGE_SIZE)] = service.DEFAULT_PAGE_SIZE,
) -> PaginatedComments:
    """Comments on a post, oldest first."""
    post = await post_service.get_post(db, post_id)
    rows, next_cursor, has_more = await service.list_for_post(
        db, post_id=post_id, cursor=cursor, limit=limit
    )

    return PaginatedComments(
        items=[
            _to_out(
                comment,
                author,
                can_delete=service.can_delete(comment, post, current_user.id),
            )
            for comment, author in rows
        ],
        next_cursor=next_cursor,
        has_more=has_more,
    )


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
) -> None:
    """Delete a comment.

    Allowed for the comment's author, and for the owner of the post it is on so they
    can moderate their own content. Anyone else gets 403.
    """
    await service.delete(db, actor=current_user, comment_id=comment_id)
