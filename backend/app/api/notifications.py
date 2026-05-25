"""
Notification API — endpoints for fetching and managing in-app notifications.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.services.notifications import (
    get_notifications,
    get_unread_count,
    mark_as_read,
    mark_all_as_read,
)

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])


@router.get("")
def list_notifications(
    user_id: str = Query(..., description="Recipient user ID"),
    unread_only: bool = Query(False, description="Only return unread notifications"),
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Fetch notifications for a user, newest first."""
    notifications = get_notifications(db, user_id, unread_only=unread_only, limit=limit)
    unread = get_unread_count(db, user_id)
    return {"notifications": notifications, "unread_count": unread}


@router.get("/unread-count")
def unread_count(
    user_id: str = Query(...),
    db: Session = Depends(get_db),
):
    """Quick endpoint to get unread notification count (for badge)."""
    return {"unread_count": get_unread_count(db, user_id)}


@router.post("/{notification_id}/read")
def read_notification(
    notification_id: str,
    user_id: str = Query(...),
    db: Session = Depends(get_db),
):
    """Mark a single notification as read."""
    success = mark_as_read(db, notification_id, user_id)
    return {"success": success}


@router.post("/read-all")
def read_all_notifications(
    user_id: str = Query(...),
    db: Session = Depends(get_db),
):
    """Mark all notifications as read for a user."""
    count = mark_all_as_read(db, user_id)
    return {"success": True, "marked_count": count}
