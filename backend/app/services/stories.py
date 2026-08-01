import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError, PermissionDeniedError
from app.core.logging import get_logger
from app.models.follow import Follow
from app.models.story import Highlight, HighlightItem, Story
from app.models.user import User

log = get_logger(__name__)

STORY_LIFETIME_HOURS = 24
MAX_HIGHLIGHTS = 100


def _now() -> datetime:
    return datetime.now(UTC)


async def create_story(
    db: AsyncSession, *, author: User, image_url: str | None, media_asset_id=None
) -> Story:
    story = Story(
        author_id=author.id,
        image_url=image_url,
        media_asset_id=media_asset_id,
        expires_at=_now() + timedelta(hours=STORY_LIFETIME_HOURS),
    )
    db.add(story)
    await db.commit()
    await db.refresh(story)
    log.info("story_created", story_id=str(story.id), author=str(author.id))
    return story


async def active_tray(db: AsyncSession, *, viewer_id: uuid.UUID) -> list[dict]:
    """One entry per author with unexpired stories — yours and those you follow.

    Expiry is filtered in the query rather than after fetching, so an expired story
    is never loaded, and nothing depends on a cleanup job having run.
    """
    followed = select(Follow.following_id).where(Follow.follower_id == viewer_id)

    stmt = (
        select(
            User,
            func.count(Story.id).label("story_count"),
            func.max(Story.created_at).label("latest_at"),
        )
        .join(Story, Story.author_id == User.id)
        .where(
            Story.expires_at > _now(),
            User.is_active.is_(True),
            or_(Story.author_id.in_(followed), Story.author_id == viewer_id),
        )
        .group_by(User.id)
        # The viewer's own row first, matching `stories.ts` where isMe leads.
        .order_by((User.id == viewer_id).desc(), func.max(Story.created_at).desc())
    )

    rows = (await db.execute(stmt)).all()

    trays: list[dict] = []
    for user, count, latest in rows:
        preview = await db.scalar(
            select(Story)
            .where(Story.author_id == user.id, Story.expires_at > _now())
            .order_by(Story.created_at.desc())
            .limit(1)
        )
        trays.append(
            {
                "author": user,
                "is_mine": user.id == viewer_id,
                "story_count": count,
                "latest_at": latest,
                "preview": preview,
            }
        )
    return trays


async def list_for_author(
    db: AsyncSession, *, author_id: uuid.UUID, viewer_id: uuid.UUID
) -> list[Story]:
    """An author's unexpired stories, oldest first — the order they are watched in."""
    rows = await db.scalars(
        select(Story)
        .where(Story.author_id == author_id, Story.expires_at > _now())
        .order_by(Story.created_at.asc())
    )
    return list(rows.all())


async def delete_story(db: AsyncSession, *, actor: User, story_id: uuid.UUID) -> None:
    story = await db.get(Story, story_id)
    if story is None:
        raise NotFoundError("Story not found")
    if story.author_id != actor.id:
        raise PermissionDeniedError("You can only delete your own stories")
    await db.delete(story)
    await db.commit()


async def purge_expired(db: AsyncSession) -> int:
    """Remove expired rows.

    Housekeeping only — correctness never depends on this running, because every
    read already filters on expires_at.
    """
    from sqlalchemy import delete as sql_delete

    result = await db.execute(sql_delete(Story).where(Story.expires_at <= _now()))
    await db.commit()
    return result.rowcount or 0


# ---------------------------------------------------------------- highlights


async def create_highlight(
    db: AsyncSession,
    *,
    owner: User,
    title: str,
    cover_url: str | None,
    story_ids: list[uuid.UUID],
) -> Highlight:
    """Save stories into a permanent highlight.

    Image references are copied rather than linked. A highlight exists precisely to
    outlive the stories in it, so pointing at rows that expire would empty it.
    """
    existing = await db.scalar(
        select(func.count()).select_from(Highlight).where(Highlight.owner_id == owner.id)
    )
    if existing and existing >= MAX_HIGHLIGHTS:
        raise PermissionDeniedError("Highlight limit reached")

    highlight = Highlight(
        owner_id=owner.id, title=title, cover_url=cover_url, position=existing or 0
    )
    db.add(highlight)
    await db.flush()

    if story_ids:
        stories = await db.scalars(select(Story).where(Story.id.in_(story_ids)))
        for index, story in enumerate(stories.all()):
            # Only your own stories may be highlighted.
            if story.author_id != owner.id:
                continue
            db.add(
                HighlightItem(
                    highlight_id=highlight.id,
                    image_url=story.image_url,
                    media_asset_id=story.media_asset_id,
                    position=index,
                )
            )
            if highlight.cover_url is None:
                highlight.cover_url = story.image_url

    await db.commit()
    await db.refresh(highlight)
    return highlight


async def list_highlights(db: AsyncSession, *, owner_id: uuid.UUID) -> list[tuple[Highlight, int]]:
    rows = (
        await db.execute(
            select(Highlight, func.count(HighlightItem.id))
            .outerjoin(HighlightItem, HighlightItem.highlight_id == Highlight.id)
            .where(Highlight.owner_id == owner_id)
            .group_by(Highlight.id)
            .order_by(Highlight.position.asc(), Highlight.created_at.asc())
        )
    ).all()
    return [(row[0], row[1]) for row in rows]


async def list_highlight_items(db: AsyncSession, *, highlight_id: uuid.UUID) -> list[HighlightItem]:
    highlight = await db.get(Highlight, highlight_id)
    if highlight is None:
        raise NotFoundError("Highlight not found")
    rows = await db.scalars(
        select(HighlightItem)
        .where(HighlightItem.highlight_id == highlight_id)
        .order_by(HighlightItem.position.asc())
    )
    return list(rows.all())


async def delete_highlight(db: AsyncSession, *, actor: User, highlight_id: uuid.UUID) -> None:
    highlight = await db.get(Highlight, highlight_id)
    if highlight is None:
        raise NotFoundError("Highlight not found")
    if highlight.owner_id != actor.id:
        raise PermissionDeniedError("You can only delete your own highlights")
    await db.delete(highlight)
    await db.commit()
