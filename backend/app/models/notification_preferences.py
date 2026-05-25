"""
Notification preferences model — stores per-user notification settings.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Boolean, DateTime
from app.database.base import Base


class NotificationPreferences(Base):
    __tablename__ = "notification_preferences"

    id = Column(String(255), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(255), nullable=False, unique=True, index=True)

    # Global toggle
    push_enabled = Column(Boolean, nullable=False, default=True)

    # Per-category toggles
    medicine_reminders = Column(Boolean, nullable=False, default=True)
    chat_messages = Column(Boolean, nullable=False, default=True)
    health_alerts = Column(Boolean, nullable=False, default=True)

    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), nullable=False,
                        default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f"<NotificationPreferences user={self.user_id}>"
