"""
DeviceToken model — stores FCM push notification tokens per user device.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, UniqueConstraint
from app.database.base import Base


class DeviceToken(Base):
    __tablename__ = "device_tokens"

    id = Column(
        String(255),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    user_id = Column(String(255), nullable=False, index=True)
    token = Column(String(512), nullable=False)
    platform = Column(String(20), nullable=False, default="android", comment="android | ios | web")
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    __table_args__ = (
        UniqueConstraint("user_id", "token", name="uq_device_token_user_token"),
    )

    def __repr__(self):
        return f"<DeviceToken user={self.user_id} platform={self.platform}>"