"""
Notification preferences API — get/update per-user push notification settings.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.notification_preferences import NotificationPreferences

router = APIRouter(prefix="/api/notification-preferences", tags=["Notification Preferences"])


def _serialize(prefs: NotificationPreferences) -> dict:
    return {
        "user_id": prefs.user_id,
        "push_enabled": prefs.push_enabled,
        "medicine_reminders": prefs.medicine_reminders,
        "chat_messages": prefs.chat_messages,
        "health_alerts": prefs.health_alerts,
    }


def _get_or_create(db: Session, user_id: str) -> NotificationPreferences:
    prefs = db.query(NotificationPreferences).filter(
        NotificationPreferences.user_id == user_id
    ).first()
    if not prefs:
        prefs = NotificationPreferences(user_id=user_id)
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    return prefs


@router.get("/{user_id}")
async def get_notification_preferences(user_id: str, db: Session = Depends(get_db)):
    """Get push notification settings for a user."""
    prefs = _get_or_create(db, user_id)
    return _serialize(prefs)


class UpdatePreferencesRequest(BaseModel):
    push_enabled: bool | None = None
    medicine_reminders: bool | None = None
    chat_messages: bool | None = None
    health_alerts: bool | None = None


@router.patch("/{user_id}")
async def update_notification_preferences(
    user_id: str,
    payload: UpdatePreferencesRequest,
    db: Session = Depends(get_db),
):
    """Update push notification settings for a user."""
    prefs = _get_or_create(db, user_id)

    if payload.push_enabled is not None:
        prefs.push_enabled = payload.push_enabled
    if payload.medicine_reminders is not None:
        prefs.medicine_reminders = payload.medicine_reminders
    if payload.chat_messages is not None:
        prefs.chat_messages = payload.chat_messages
    if payload.health_alerts is not None:
        prefs.health_alerts = payload.health_alerts

    db.commit()
    db.refresh(prefs)
    return _serialize(prefs)
