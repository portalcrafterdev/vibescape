import uuid
from datetime import UTC, datetime

from sqlalchemy import and_, func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError, NotFoundError, PermissionDeniedError
from app.core.logging import get_logger
from app.models.message import Conversation, ConversationParticipant, Message
from app.models.user import User
from app.services.posts import decode_cursor, encode_cursor

log = get_logger(__name__)

DEFAULT_PAGE_SIZE = 30
MAX_PAGE_SIZE = 100
PREVIEW_LENGTH = 200


class CannotMessageSelfError(AppError):
    status_code = 400
    code = "cannot_message_self"
    message = "You cannot start a conversation with yourself"


def _now() -> datetime:
    return datetime.now(UTC)


def _dm_key(a: uuid.UUID, b: uuid.UUID) -> str:
    """Stable identity for a two-person thread.

    Sorted so (a, b) and (b, a) produce the same key — otherwise each side would
    open its own conversation and neither would see the other's messages.
    """
    return ":".join(sorted([str(a), str(b)]))


# ---------------------------------------------------------------- membership


async def require_participant(
    db: AsyncSession, *, conversation_id: uuid.UUID, user_id: uuid.UUID
) -> Conversation:
    """Authorisation for everything in this module.

    Checked here rather than at each route so no endpoint — REST or WebSocket —
    can reach a conversation's contents without passing through it.
    """
    conversation = await db.get(Conversation, conversation_id)
    if conversation is None:
        raise NotFoundError("Conversation not found")

    member = await db.scalar(
        select(ConversationParticipant.id).where(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user_id,
        )
    )
    if member is None:
        # Deliberately 404, not 403: a 403 confirms the conversation exists, which
        # tells an outsider something about other people's threads.
        raise NotFoundError("Conversation not found")

    return conversation


async def participant_ids(db: AsyncSession, conversation_id: uuid.UUID) -> list[uuid.UUID]:
    rows = await db.scalars(
        select(ConversationParticipant.user_id).where(
            ConversationParticipant.conversation_id == conversation_id
        )
    )
    return list(rows.all())


async def conversation_ids_for(db: AsyncSession, user_id: uuid.UUID) -> list[uuid.UUID]:
    rows = await db.scalars(
        select(ConversationParticipant.conversation_id).where(
            ConversationParticipant.user_id == user_id
        )
    )
    return list(rows.all())


# ---------------------------------------------------------------- conversations


async def get_or_create_dm(
    db: AsyncSession, *, initiator: User, other_id: uuid.UUID
) -> Conversation:
    """Open a direct thread, reusing the existing one if there is one."""
    if initiator.id == other_id:
        raise CannotMessageSelfError()

    other = await db.get(User, other_id)
    if other is None or not other.is_active:
        raise NotFoundError("User not found")

    key = _dm_key(initiator.id, other_id)

    existing = await db.scalar(select(Conversation).where(Conversation.dm_key == key))
    if existing is not None:
        return existing

    conversation = Conversation(dm_key=key)
    db.add(conversation)
    try:
        await db.flush()
    except IntegrityError:
        # Both sides tapped at once. The unique key means one insert wins and the
        # loser reads the winner's row rather than creating a duplicate thread.
        await db.rollback()
        found = await db.scalar(select(Conversation).where(Conversation.dm_key == key))
        if found is None:
            raise
        return found

    db.add(ConversationParticipant(conversation_id=conversation.id, user_id=initiator.id))
    db.add(ConversationParticipant(conversation_id=conversation.id, user_id=other_id))
    await db.commit()
    await db.refresh(conversation)

    log.info("dm_created", conversation_id=str(conversation.id))
    return conversation


async def list_conversations(db: AsyncSession, *, user_id: uuid.UUID, limit: int) -> list[dict]:
    """The conversation list, shaped like `MessageData.ts`.

    Unread is counted from the read cursor in the same query rather than a stored
    number, so it cannot disagree with the messages actually present.
    """
    me = ConversationParticipant
    them = ConversationParticipant.__table__.alias("them")

    unread = (
        select(func.count(Message.id))
        .where(
            Message.conversation_id == Conversation.id,
            Message.sender_id != user_id,
            or_(me.last_read_at.is_(None), Message.created_at > me.last_read_at),
        )
        .correlate(Conversation, me)
        .scalar_subquery()
    )

    stmt = (
        select(Conversation, User, unread.label("unread_count"))
        .join(me, and_(me.conversation_id == Conversation.id, me.user_id == user_id))
        .join(
            them,
            and_(
                them.c.conversation_id == Conversation.id,
                them.c.user_id != user_id,
            ),
        )
        .join(User, User.id == them.c.user_id)
        .where(User.is_active.is_(True))
        .order_by(Conversation.last_message_at.desc().nullslast(), Conversation.created_at.desc())
        .limit(limit)
    )

    rows = (await db.execute(stmt)).all()
    return [{"conversation": row[0], "other": row[1], "unread_count": row[2] or 0} for row in rows]


async def total_unread(db: AsyncSession, *, user_id: uuid.UUID) -> int:
    rows = await list_conversations(db, user_id=user_id, limit=MAX_PAGE_SIZE)
    return sum(r["unread_count"] for r in rows)


# ---------------------------------------------------------------- messages


async def send_message(
    db: AsyncSession, *, sender: User, conversation_id: uuid.UUID, body: str
) -> Message:
    await require_participant(db, conversation_id=conversation_id, user_id=sender.id)

    message = Message(conversation_id=conversation_id, sender_id=sender.id, body=body)
    db.add(message)
    await db.flush()

    await db.execute(
        update(Conversation)
        .where(Conversation.id == conversation_id)
        .values(
            last_message_at=message.created_at or _now(),
            last_message_preview=body[:PREVIEW_LENGTH],
        )
    )
    await db.commit()
    await db.refresh(message)

    log.info("message_sent", conversation_id=str(conversation_id), sender=str(sender.id))
    return message


async def list_messages(
    db: AsyncSession, *, conversation_id: uuid.UUID, viewer_id: uuid.UUID, cursor, limit: int
) -> tuple[list[tuple[Message, User]], str | None, bool]:
    """History, newest first, so the first page is what opens on screen."""
    await require_participant(db, conversation_id=conversation_id, user_id=viewer_id)

    stmt = (
        select(Message, User)
        .join(User, User.id == Message.sender_id)
        .where(Message.conversation_id == conversation_id)
    )

    if cursor:
        after_time, after_id = decode_cursor(cursor)
        stmt = stmt.where(
            or_(
                Message.created_at < after_time,
                and_(Message.created_at == after_time, Message.id < after_id),
            )
        )

    stmt = stmt.order_by(Message.created_at.desc(), Message.id.desc()).limit(limit + 1)
    rows = (await db.execute(stmt)).all()

    has_more = len(rows) > limit
    page = rows[:limit]
    next_cursor = (
        encode_cursor(page[-1][0].created_at, page[-1][0].id) if has_more and page else None
    )
    return [(r[0], r[1]) for r in page], next_cursor, has_more


async def mark_read(db: AsyncSession, *, user: User, conversation_id: uuid.UUID) -> int:
    """Advance the read cursor. Returns the remaining unread count, which is 0."""
    await require_participant(db, conversation_id=conversation_id, user_id=user.id)

    await db.execute(
        update(ConversationParticipant)
        .where(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user.id,
        )
        .values(last_read_at=_now())
    )
    await db.commit()
    return 0


async def unread_for(db: AsyncSession, *, conversation_id: uuid.UUID, user_id: uuid.UUID) -> int:
    participant = await db.scalar(
        select(ConversationParticipant).where(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user_id,
        )
    )
    if participant is None:
        raise PermissionDeniedError("Not a participant")

    stmt = select(func.count(Message.id)).where(
        Message.conversation_id == conversation_id,
        Message.sender_id != user_id,
    )
    if participant.last_read_at is not None:
        stmt = stmt.where(Message.created_at > participant.last_read_at)

    return await db.scalar(stmt) or 0
