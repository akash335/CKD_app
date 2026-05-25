"""Doctor-patient messaging API."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import asyncio

from app.database.session import get_db
from app.schemas.chat import (
    ConversationResponse,
    DeleteMessageResponse,
    MessageResponse,
    SendMessageRequest,
)
from app.services.chat import (
    create_message,
    delete_message,
    get_messages,
    list_conversations,
    serialize_message,
)
from app.services.push_notifications import send_new_message_notification
from app.services.notifications import create_message_notification
from app.websockets.chat import chat_manager
from app.models.user import User



router = APIRouter(tags=["Messages"])


@router.post("/messages/send", response_model=MessageResponse)
async def send_message(payload: SendMessageRequest, db: Session = Depends(get_db)):
    try:
        message = create_message(
            db,
            sender_id=payload.sender_id,
            receiver_id=payload.receiver_id,
            message_text=payload.message_text,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    serialized = serialize_message(message)
    await chat_manager.broadcast(
        message.conversation_id,
        {"type": "message", "message": serialized},
    )

    # Fire-and-forget push notification to receiver (non-blocking)
    sender = db.query(User).filter(User.id == payload.sender_id).first()
    sender_name = sender.name if sender and sender.name else "CKD Guardian"
    asyncio.create_task(
        asyncio.to_thread(
            send_new_message_notification,
            db,
            payload.receiver_id,
            sender_name,
            payload.message_text,
            message.conversation_id,
        )
    )

    # Create in-app notification for receiver
    try:
        create_message_notification(
            db=db,
            receiver_id=payload.receiver_id,
            sender_id=payload.sender_id,
            sender_name=sender_name,
            message_preview=payload.message_text,
            conversation_id=message.conversation_id,
        )
    except Exception:
        pass  # Non-critical — don't break the message flow

    return serialized


@router.get("/messages/{conversation_id}", response_model=list[MessageResponse])
async def get_conversation_messages(
    conversation_id: str,
    user_id: str = Query(..., description="Current user ID"),
    db: Session = Depends(get_db),
):
    try:
        return get_messages(db, conversation_id, user_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/conversations", response_model=list[ConversationResponse])
async def get_user_conversations(
    user_id: str = Query(..., description="Current user ID"),
    db: Session = Depends(get_db),
):
    try:
        return list_conversations(db, user_id, chat_manager.is_user_online)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.delete("/messages/{message_id}", response_model=DeleteMessageResponse)
async def delete_conversation_message(
    message_id: str,
    user_id: str = Query(..., description="Current user ID"),
    db: Session = Depends(get_db),
):
    try:
        result = delete_message(db, message_id, user_id)
    except ValueError as exc:
        detail = str(exc)
        if detail == "Message not found." or detail == "Conversation not found.":
            raise HTTPException(status_code=404, detail=detail)
        raise HTTPException(status_code=403, detail=detail)

    await chat_manager.broadcast(
        result["conversation_id"],
        {
            "type": "message_deleted",
            "message_id": result["message_id"],
            "conversation_id": result["conversation_id"],
            "last_message": result["last_message"],
            "last_message_at": result["last_message_at"],
            "updated_at": result["updated_at"],
        },
    )
    return result
