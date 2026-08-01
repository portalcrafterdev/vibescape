import uuid
from typing import Annotated

from fastapi import APIRouter, Query, status

from app.core.deps import CurrentUser, DbSession
from app.models.message import Message
from app.models.user import User
from app.schemas.message import (
    ConversationOut,
    ConversationRow,
    MessageOut,
    PaginatedMessages,
    SendMessageRequest,
    StartConversationRequest,
    UnreadTotal,
)
from app.schemas.post import PostAuthor
from app.services import messages as service
from app.services import presence
from app.services import users as user_service
from app.services.realtime import manager

router = APIRouter(tags=["messages"])


def _to_out(message: Message, sender: User, *, viewer_id: uuid.UUID) -> MessageOut:
    return MessageOut(
        id=message.id,
        conversation_id=message.conversation_id,
        sender=PostAuthor.model_validate(sender),
        body=message.body,
        created_at=message.created_at,
        is_mine=message.sender_id == viewer_id,
    )


@router.get("/conversations", response_model=list[ConversationRow])
async def list_conversations(
    db: DbSession,
    current_user: CurrentUser,
    limit: Annotated[int, Query(ge=1, le=service.MAX_PAGE_SIZE)] = service.DEFAULT_PAGE_SIZE,
) -> list[ConversationRow]:
    """Your conversations, most recent first.

    Presence for the whole page resolves in one Redis round trip rather than one
    call per row.
    """
    rows = await service.list_conversations(db, user_id=current_user.id, limit=limit)
    online = await presence.online_set([r["other"].id for r in rows])

    return [
        ConversationRow(
            id=r["conversation"].id,
            other=PostAuthor.model_validate(r["other"]),
            last_message=r["conversation"].last_message_preview,
            last_message_at=r["conversation"].last_message_at,
            unread_count=r["unread_count"],
            online=r["other"].id in online,
        )
        for r in rows
    ]


@router.get("/conversations/unread", response_model=UnreadTotal)
async def unread_total(db: DbSession, current_user: CurrentUser) -> UnreadTotal:
    """Total unread across all threads, for the tab badge."""
    return UnreadTotal(unread_total=await service.total_unread(db, user_id=current_user.id))


@router.post("/conversations", response_model=ConversationOut, status_code=status.HTTP_201_CREATED)
async def start_conversation(
    payload: StartConversationRequest, db: DbSession, current_user: CurrentUser
) -> ConversationOut:
    """Open a direct thread. Returns the existing one if it already exists."""
    conversation = await service.get_or_create_dm(
        db, initiator=current_user, other_id=payload.user_id
    )
    other = await user_service.get_by_id(db, payload.user_id)

    return ConversationOut(
        id=conversation.id,
        participants=[
            PostAuthor.model_validate(current_user),
            PostAuthor.model_validate(other),
        ],
        created_at=conversation.created_at,
    )


@router.get("/conversations/{conversation_id}/messages", response_model=PaginatedMessages)
async def list_messages(
    conversation_id: uuid.UUID,
    db: DbSession,
    current_user: CurrentUser,
    cursor: str | None = None,
    limit: Annotated[int, Query(ge=1, le=service.MAX_PAGE_SIZE)] = service.DEFAULT_PAGE_SIZE,
) -> PaginatedMessages:
    """Message history, newest first.

    A non-participant gets 404 rather than 403 — a 403 would confirm the thread
    exists, which is itself information about other people's conversations.
    """
    rows, next_cursor, has_more = await service.list_messages(
        db,
        conversation_id=conversation_id,
        viewer_id=current_user.id,
        cursor=cursor,
        limit=limit,
    )
    return PaginatedMessages(
        items=[_to_out(m, sender, viewer_id=current_user.id) for m, sender in rows],
        next_cursor=next_cursor,
        has_more=has_more,
    )


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=MessageOut,
    status_code=status.HTTP_201_CREATED,
)
async def send_message(
    conversation_id: uuid.UUID,
    payload: SendMessageRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> MessageOut:
    """Send a message and push it to every participant's open sockets.

    Recipients come from database membership, not from anything the caller supplies.
    """
    message = await service.send_message(
        db, sender=current_user, conversation_id=conversation_id, body=payload.body
    )
    out = _to_out(message, current_user, viewer_id=current_user.id)

    recipients = await service.participant_ids(db, conversation_id)
    await manager.publish(
        recipients,
        {
            "type": "message.created",
            "conversation_id": str(conversation_id),
            "message": out.model_dump(mode="json"),
        },
    )
    return out


@router.post("/conversations/{conversation_id}/read", response_model=UnreadTotal)
async def mark_read(
    conversation_id: uuid.UUID, db: DbSession, current_user: CurrentUser
) -> UnreadTotal:
    """Advance your read cursor for this thread."""
    await service.mark_read(db, user=current_user, conversation_id=conversation_id)
    return UnreadTotal(unread_total=await service.total_unread(db, user_id=current_user.id))
