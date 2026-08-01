import uuid

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, PermissionDeniedError
from app.core.logging import get_logger
from app.models.comment import Comment
from app.models.post import Post
from app.models.user import User
from app.services.posts import decode_cursor, encode_cursor, get_post, invalidate_feed

log = get_logger(__name__)

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 50


async def create(
    db: AsyncSession, *, author: User, post_id: uuid.UUID, body: str
) -> tuple[Comment, int]:
    """Add a comment. Returns it plus the post's new comment count."""
    post = await get_post(db, post_id)

    comment = Comment(post_id=post.id, author_id=author.id, body=body)
    db.add(comment)

    # Through SQL rather than a read-modify-write, so concurrent comments cannot
    # lose an increment.
    await db.execute(
        update(Post).where(Post.id == post.id).values(comments_count=Post.comments_count + 1)
    )
    await db.commit()
    await db.refresh(comment)

    # The count is rendered on every feed card, so a stale feed would show the old
    # number. Invalidate the commenter's own view; others expire on the feed TTL.
    await invalidate_feed(author.id)

    log.info("comment_created", comment_id=str(comment.id), post_id=str(post_id))
    return comment, await _comments_count(db, post_id)


async def list_for_post(
    db: AsyncSession, *, post_id: uuid.UUID, cursor: str | None, limit: int
) -> tuple[list[tuple[Comment, User]], str | None, bool]:
    """Comments on a post, oldest first — the order a conversation reads in.

    Keyset over (created_at, id) like the feed, so a new comment arriving mid-scroll
    cannot shift rows across page boundaries.
    """
    stmt = (
        select(Comment, User)
        .join(User, User.id == Comment.author_id)
        .where(Comment.post_id == post_id, User.is_active.is_(True))
    )

    if cursor:
        after_time, after_id = decode_cursor(cursor)
        stmt = stmt.where(
            (Comment.created_at, Comment.id) > (after_time, after_id)  # type: ignore[operator]
        )

    stmt = stmt.order_by(Comment.created_at.asc(), Comment.id.asc()).limit(limit + 1)
    rows = (await db.execute(stmt)).all()

    has_more = len(rows) > limit
    page = rows[:limit]
    next_cursor = (
        encode_cursor(page[-1][0].created_at, page[-1][0].id) if has_more and page else None
    )
    return [(row[0], row[1]) for row in page], next_cursor, has_more


async def delete(db: AsyncSession, *, actor: User, comment_id: uuid.UUID) -> int:
    """Remove a comment. Returns the post's new comment count.

    Two people may delete: the comment's author, and the owner of the post it sits
    on. The second is moderation — without it, someone can leave abuse on your post
    and you have no way to remove it. Anyone else is refused.
    """
    comment = await db.get(Comment, comment_id)
    if comment is None:
        raise NotFoundError("Comment not found")

    post = await db.get(Post, comment.post_id)
    is_author = comment.author_id == actor.id
    owns_post = post is not None and post.author_id == actor.id

    if not (is_author or owns_post):
        raise PermissionDeniedError("You can only delete your own comments")

    post_id = comment.post_id
    await db.delete(comment)
    await db.execute(
        update(Post)
        .where(Post.id == post_id)
        .values(comments_count=func.greatest(Post.comments_count - 1, 0))
    )
    await db.commit()
    await invalidate_feed(actor.id)

    log.info(
        "comment_deleted",
        comment_id=str(comment_id),
        actor=str(actor.id),
        as_post_owner=owns_post and not is_author,
    )
    return await _comments_count(db, post_id)


def can_delete(comment: Comment, post: Post, viewer_id: uuid.UUID) -> bool:
    return comment.author_id == viewer_id or post.author_id == viewer_id


async def _comments_count(db: AsyncSession, post_id: uuid.UUID) -> int:
    """Scalar read — a bulk update() expires the mapped instance, and touching an
    attribute afterwards raises MissingGreenlet under asyncio."""
    return await db.scalar(select(Post.comments_count).where(Post.id == post_id)) or 0
