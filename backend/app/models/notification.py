"""
Notification model — stores in-app notifications for all users.

Notification types:
  - new_message:       A connected user sent a chat message
  - connection_request: A patient requested to connect
  - connection_accepted: A doctor accepted the connection
  - health_alert:      A health risk alert was triggered
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, String, Text, JSON
from sqlalchemy.orm import relationship

from app.database.base import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(
        String(255),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    user_id = Column(
        String(255),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="The recipient of this notification",
    )
    sender_id = Column(
        String(255),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="The user who triggered this notification (if applicable)",
    )
    type = Column(
        String(50),
        nullable=False,
        index=True,
        comment="Notification type: new_message, connection_request, connection_accepted, health_alert",
    )
    title = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    data = Column(
        JSON,
        nullable=True,
        comment="Extra payload (conversation_id, request_id, etc.)",
    )
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    sender = relationship("User", foreign_keys=[sender_id])

    __table_args__ = (
        Index("ix_notifications_user_unread", "user_id", "is_read"),
        Index("ix_notifications_user_created", "user_id", "created_at"),
    )

    def __repr__(self):
        return f"<Notification {self.id} type={self.type} user={self.user_id}>"
