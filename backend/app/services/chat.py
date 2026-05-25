"""Database service functions for doctor-patient messaging."""

import uuid
from datetime import datetime, timezone
from typing import Callable

from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from app.models.chat import Conversation, Message
from app.models.doctor_patient import DoctorPatient
from app.models.user import User


def _iso(dt: datetime) -> str:
    return dt.isoformat()


def serialize_message(message: Message) -> dict:
    return {
        "id": message.id,
        "conversation_id": message.conversation_id,
        "sender_id": message.sender_id,
        "receiver_id": message.receiver_id,
        "message_text": message.message_text,
        "created_at": _iso(message.created_at),
        "is_read": message.is_read,
    }


def _get_relationship(db: Session, user_a_id: str, user_b_id: str) -> DoctorPatient | None:
    return db.query(DoctorPatient).filter(
        or_(
            and_(
                DoctorPatient.doctor_id == user_a_id,
                DoctorPatient.patient_id == user_b_id,
            ),
            and_(
                DoctorPatient.doctor_id == user_b_id,
                DoctorPatient.patient_id == user_a_id,
            ),
        )
    ).first()


def ensure_messaging_allowed(db: Session, sender_id: str, receiver_id: str) -> DoctorPatient:
    if sender_id == receiver_id:
        raise ValueError("Sender and receiver must be different users.")

    # Load both users in ONE query instead of two separate queries
    users = db.query(User).filter(User.id.in_({sender_id, receiver_id})).all()
    user_map = {u.id: u for u in users}
    if sender_id not in user_map or receiver_id not in user_map:
        raise ValueError("Sender or receiver not found.")

    relationship = _get_relationship(db, sender_id, receiver_id)
    if not relationship:
        raise ValueError("Messaging is only available for accepted doctor-patient connections.")

    return relationship


def get_or_create_conversation(db: Session, sender_id: str, receiver_id: str) -> Conversation:
    relationship = ensure_messaging_allowed(db, sender_id, receiver_id)

    conversation = db.query(Conversation).filter(
        Conversation.doctor_id == relationship.doctor_id,
        Conversation.patient_id == relationship.patient_id,
    ).first()
    if conversation:
        return conversation

    now = datetime.now(timezone.utc)
    conversation = Conversation(
        id=str(uuid.uuid4()),
        doctor_id=relationship.doctor_id,
        patient_id=relationship.patient_id,
        created_at=now,
        updated_at=now,
    )
    db.add(conversation)
    db.flush()
    return conversation


def is_conversation_participant(db: Session, conversation_id: str, user_id: str) -> bool:
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    return bool(
        conversation
        and (conversation.doctor_id == user_id or conversation.patient_id == user_id)
    )


def get_conversation(db: Session, conversation_id: str) -> Conversation | None:
    return db.query(Conversation).filter(Conversation.id == conversation_id).first()


def create_message(db: Session, sender_id: str, receiver_id: str, message_text: str) -> Message:
    clean_text = message_text.strip()
    if not clean_text:
        raise ValueError("Message cannot be empty.")

    conversation = get_or_create_conversation(db, sender_id, receiver_id)
    now = datetime.now(timezone.utc)

    message = Message(
        id=str(uuid.uuid4()),
        conversation_id=conversation.id,
        sender_id=sender_id,
        receiver_id=receiver_id,
        message_text=clean_text,
        created_at=now,
        is_read="false",
    )
    conversation.updated_at = now

    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def get_messages(db: Session, conversation_id: str, user_id: str) -> list[dict]:
    # Inline participant check — avoids a separate query
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation or (conversation.doctor_id != user_id and conversation.patient_id != user_id):
        raise ValueError("Conversation not found.")

    # Mark unread messages as read (bulk update — single query)
    db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.receiver_id == user_id,
        Message.is_read == "false",
    ).update({"is_read": "true"}, synchronize_session=False)
    db.commit()

    messages = db.query(Message).filter(
        Message.conversation_id == conversation_id,
    ).order_by(Message.created_at.asc()).all()
    return [serialize_message(message) for message in messages]


def delete_message(db: Session, message_id: str, user_id: str) -> dict:
    message = db.query(Message).filter(Message.id == message_id).first()
    if not message:
        raise ValueError("Message not found.")

    if message.sender_id != user_id:
        raise ValueError("Only the sender can delete this message.")

    conversation = get_conversation(db, message.conversation_id)
    if not conversation:
        raise ValueError("Conversation not found.")

    conversation_id = message.conversation_id
    db.delete(message)
    db.flush()

    latest_message = db.query(Message).filter(
        Message.conversation_id == conversation_id,
    ).order_by(Message.created_at.desc()).first()

    fallback_updated_at = datetime.now(timezone.utc)
    conversation.updated_at = latest_message.created_at if latest_message else fallback_updated_at

    db.commit()

    return {
        "success": True,
        "message": "Message deleted successfully.",
        "message_id": message_id,
        "conversation_id": conversation_id,
        "last_message": latest_message.message_text if latest_message else None,
        "last_message_at": _iso(latest_message.created_at) if latest_message else None,
        "updated_at": _iso(conversation.updated_at),
    }


def _conversation_summary(
    db: Session,
    conversation: Conversation,
    user_id: str,
    is_online: Callable[[str], bool] | None = None,
) -> dict:
    """Build summary for a single conversation (used for single-conversation needs)."""
    participant_id = (
        conversation.patient_id if conversation.doctor_id == user_id else conversation.doctor_id
    )
    participant = db.query(User).filter(User.id == participant_id).first()
    latest_message = db.query(Message).filter(
        Message.conversation_id == conversation.id,
    ).order_by(Message.created_at.desc()).first()
    unread_count = db.query(func.count(Message.id)).filter(
        Message.conversation_id == conversation.id,
        Message.receiver_id == user_id,
        Message.is_read == "false",
    ).scalar() or 0

    return {
        "id": conversation.id,
        "doctor_id": conversation.doctor_id,
        "patient_id": conversation.patient_id,
        "participant_id": participant_id,
        "participant_name": participant.name if participant and participant.name else "Unknown User",
        "participant_image": participant.image if participant else None,
        "last_message": latest_message.message_text if latest_message else None,
        "last_message_at": _iso(latest_message.created_at) if latest_message else None,
        "unread_count": unread_count,
        "is_online": is_online(participant_id) if is_online else False,
        "created_at": _iso(conversation.created_at),
        "updated_at": _iso(conversation.updated_at),
    }


def list_conversations(
    db: Session,
    user_id: str,
    is_online: Callable[[str], bool] | None = None,
) -> list[dict]:
    """List all conversations for a user with participant info, last message, and unread counts.
    
    Optimized: uses 4 total queries regardless of conversation count.
    Before: 3N+2 queries (user check + conversations + 3 per conversation).
    After:  4 queries (conversations + batch users + batch latest msgs + batch unreads).
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise ValueError("User not found.")

    conversations = db.query(Conversation).filter(
        or_(
            Conversation.doctor_id == user_id,
            Conversation.patient_id == user_id,
        )
    ).order_by(Conversation.updated_at.desc()).all()

    if not conversations:
        return []

    # ── 1. Batch-load all participant Users in ONE query ─────────────────
    participant_ids: set[str] = set()
    conv_id_list: list[str] = []
    for conv in conversations:
        pid = conv.patient_id if conv.doctor_id == user_id else conv.doctor_id
        participant_ids.add(pid)
        conv_id_list.append(conv.id)

    participants = db.query(User).filter(User.id.in_(participant_ids)).all()
    participant_map: dict[str, User] = {u.id: u for u in participants}

    # ── 2. Batch-load latest message per conversation in ONE query ───────
    # Use a subquery to get the max created_at per conversation, then join
    from sqlalchemy import tuple_
    latest_times_sq = (
        db.query(
            Message.conversation_id,
            func.max(Message.created_at).label("max_created"),
        )
        .filter(Message.conversation_id.in_(conv_id_list))
        .group_by(Message.conversation_id)
        .subquery()
    )
    latest_messages = (
        db.query(Message)
        .join(
            latest_times_sq,
            and_(
                Message.conversation_id == latest_times_sq.c.conversation_id,
                Message.created_at == latest_times_sq.c.max_created,
            ),
        )
        .all()
    )
    latest_msg_map: dict[str, Message] = {m.conversation_id: m for m in latest_messages}

    # ── 3. Batch-load unread counts per conversation in ONE query ────────
    unread_rows = (
        db.query(
            Message.conversation_id,
            func.count(Message.id).label("cnt"),
        )
        .filter(
            Message.conversation_id.in_(conv_id_list),
            Message.receiver_id == user_id,
            Message.is_read == "false",
        )
        .group_by(Message.conversation_id)
        .all()
    )
    unread_map: dict[str, int] = {row.conversation_id: row.cnt for row in unread_rows}

    # ── 4. Build response list — pure dict assembly, no DB calls ────────
    result = []
    for conv in conversations:
        participant_id = conv.patient_id if conv.doctor_id == user_id else conv.doctor_id
        participant = participant_map.get(participant_id)
        latest = latest_msg_map.get(conv.id)
        unread = unread_map.get(conv.id, 0)

        result.append({
            "id": conv.id,
            "doctor_id": conv.doctor_id,
            "patient_id": conv.patient_id,
            "participant_id": participant_id,
            "participant_name": participant.name if participant and participant.name else "Unknown User",
            "participant_image": participant.image if participant else None,
            "last_message": latest.message_text if latest else None,
            "last_message_at": _iso(latest.created_at) if latest else None,
            "unread_count": unread,
            "is_online": is_online(participant_id) if is_online else False,
            "created_at": _iso(conv.created_at),
            "updated_at": _iso(conv.updated_at),
        })

    return result
