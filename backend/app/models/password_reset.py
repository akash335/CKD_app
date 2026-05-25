"""
Password Reset model — OTP-based password recovery.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship

from app.database.base import Base


class PasswordReset(Base):
    __tablename__ = "password_resets"

    id = Column(
        String(255),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    user_id = Column(
        String(255),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    otp_code = Column(
        String(10),
        nullable=False,
        comment="One-time password code",
    )
    expiry_time = Column(
        DateTime(timezone=True),
        nullable=False,
        comment="When this OTP expires",
    )
    used = Column(
        String(5),
        nullable=False,
        default="false",
        comment="Whether this OTP has been consumed",
    )
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # ── Relationships ────────────────────────────────────────────────────
    user = relationship("User", back_populates="password_resets")

    # ── Indexes ──────────────────────────────────────────────────────────
    __table_args__ = (
        Index("ix_password_resets_user_expiry", "user_id", "expiry_time"),
    )

    def __repr__(self):
        return f"<PasswordReset {self.id} user={self.user_id}>"
