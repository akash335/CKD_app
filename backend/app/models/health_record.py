"""
Health Record model — flexible JSON storage for multi-input health data.

Stores raw inputs as JSON so the schema doesn't break when ML features change.
Each record can be linked to exactly one prediction.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, DateTime, ForeignKey, Index, JSON
)
from sqlalchemy.orm import relationship

from app.database.base import Base


class HealthRecord(Base):
    __tablename__ = "health_records"

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

    input_type = Column(
        String(20),
        nullable=False,
        comment="hospital | urea | medical-report",
    )

    raw_input = Column(
        JSON,
        nullable=False,
        comment="Flexible JSON storage for any input features — ML-ready",
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    # Relationships
    user = relationship("User", back_populates="health_records")

    prediction = relationship(
        "Prediction",
        back_populates="record",
        uselist=False,
        cascade="all, delete-orphan",
    )

    # Composite indexes for performance
    __table_args__ = (
        Index("ix_health_records_user_created", "user_id", "created_at"),
        Index("ix_health_records_user_type", "user_id", "input_type"),
    )

    def __repr__(self):
        return f"<HealthRecord {self.id} user={self.user_id} type={self.input_type}>"