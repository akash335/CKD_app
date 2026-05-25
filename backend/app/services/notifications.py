"""
Notification service — CRUD + creation helpers for in-app notifications.
"""

import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.user import User

logger = logging.getLogger(__name__)


def create_notification(
    db: Session,
    user_id: str,
    type: str,
    title: str,
    body: str,
    sender_id: Optional[str] = None,
    data: Optional[dict] = None,
) -> Notification:
    """Create and persist a new notification."""
    notification = Notification(
        id=str(uuid.uuid4()),
        user_id=user_id,
        sender_id=sender_id,
        type=type,
        title=title,
        body=body,
        data=data or {},
        is_read=False,
        created_at=datetime.now(timezone.utc),
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def get_notifications(
    db: Session,
    user_id: str,
    unread_only: bool = False,
    limit: int = 30,
) -> list[dict]:
    """Fetch recent notifications for a user."""
    query = db.query(Notification).filter(Notification.user_id == user_id)
    if unread_only:
        query = query.filter(Notification.is_read == False)
    notifications = query.order_by(Notification.created_at.desc()).limit(limit).all()

    return [_serialize(n, db) for n in notifications]


def get_unread_count(db: Session, user_id: str) -> int:
    """Return count of unread notifications."""
    return (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read == False)
        .count()
    )


def mark_as_read(db: Session, notification_id: str, user_id: str) -> bool:
    """Mark a single notification as read."""
    updated = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == user_id)
        .update({"is_read": True}, synchronize_session=False)
    )
    db.commit()
    return updated > 0


def mark_all_as_read(db: Session, user_id: str) -> int:
    """Mark all unread notifications as read. Returns count updated."""
    updated = (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read == False)
        .update({"is_read": True}, synchronize_session=False)
    )
    db.commit()
    return updated


# ── Convenience creators ─────────────────────────────────────────────────────

def create_message_notification(
    db: Session,
    receiver_id: str,
    sender_id: str,
    sender_name: str,
    message_preview: str,
    conversation_id: str,
) -> Notification:
    """Create a notification when a new chat message is received."""
    preview = message_preview[:80] + "…" if len(message_preview) > 80 else message_preview
    return create_notification(
        db=db,
        user_id=receiver_id,
        sender_id=sender_id,
        type="new_message",
        title=f"💬 {sender_name}",
        body=preview,
        data={"conversation_id": conversation_id, "sender_name": sender_name},
    )


def create_connection_request_notification(
    db: Session,
    doctor_id: str,
    patient_id: str,
    patient_name: str,
    request_id: str,
) -> Notification:
    """Create a notification when a patient sends a connection request."""
    return create_notification(
        db=db,
        user_id=doctor_id,
        sender_id=patient_id,
        type="connection_request",
        title="🔗 New Connection Request",
        body=f"{patient_name} wants to connect with you.",
        data={"request_id": request_id, "patient_name": patient_name},
    )


def create_connection_accepted_notification(
    db: Session,
    patient_id: str,
    doctor_id: str,
    doctor_name: str,
    request_id: str,
) -> Notification:
    """Create a notification when a doctor accepts a connection."""
    return create_notification(
        db=db,
        user_id=patient_id,
        sender_id=doctor_id,
        type="connection_accepted",
        title="✅ Connection Accepted",
        body=f"Dr. {doctor_name} accepted your connection request.",
        data={"request_id": request_id, "doctor_name": doctor_name},
    )


def create_health_alert_notification(
    db: Session,
    user_id: str,
    risk_level: str,
    explanation: str,
) -> Notification:
    """Create a notification for health risk alerts."""
    risk_emoji = {"low": "✅", "moderate": "⚠️", "high": "🔴", "critical": "🚨"}.get(
        risk_level.lower(), "⚠️"
    )
    preview = explanation[:100] + "…" if len(explanation) > 100 else explanation
    return create_notification(
        db=db,
        user_id=user_id,
        type="health_alert",
        title=f"{risk_emoji} {risk_level.upper()} Risk Alert",
        body=preview,
        data={"risk_level": risk_level},
    )


# ── Serialization ─────────────────────────────────────────────────────────────

def _serialize(n: Notification, db: Session) -> dict:
    """Serialize a notification to a dict, including sender info."""
    sender_name = None
    sender_image = None
    if n.sender_id:
        sender = db.query(User.name, User.image).filter(User.id == n.sender_id).first()
        if sender:
            sender_name = sender.name
            sender_image = sender.image

    return {
        "id": n.id,
        "user_id": n.user_id,
        "sender_id": n.sender_id,
        "sender_name": sender_name,
        "sender_image": sender_image,
        "type": n.type,
        "title": n.title,
        "body": n.body,
        "data": n.data or {},
        "is_read": n.is_read,
        "created_at": n.created_at.isoformat() if n.created_at else None,
    }
