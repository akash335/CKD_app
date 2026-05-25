"""Medication management models for CKD patient workflows."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Index, Integer, JSON, String
from sqlalchemy.orm import relationship

from app.database.base import Base


class Medication(Base):
    __tablename__ = "medications"

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
    )
    name = Column(String(160), nullable=False)
    prescribing_doctor = Column(String(120), nullable=False)
    start_date = Column(String(20), nullable=False)
    end_date = Column(String(20), nullable=True)

    dose_amount = Column(Float, nullable=False)
    unit = Column(String(20), nullable=False)
    route = Column(String(20), nullable=False)
    frequency = Column(String(32), nullable=False)

    custom_times = Column(JSON, nullable=False, default=list)
    schedule_times = Column(JSON, nullable=False, default=list)
    meal_links = Column(JSON, nullable=False, default=dict)

    quantity_on_hand = Column(Float, nullable=False)
    refill_alert_threshold_days = Column(Integer, nullable=False, default=7)

    pill_photo_name = Column(String(255), nullable=True)
    is_phosphate_binder = Column(Boolean, nullable=False, default=False)

    interaction_severe = Column(JSON, nullable=False, default=list)
    interaction_moderate = Column(JSON, nullable=False, default=list)
    interaction_none = Column(JSON, nullable=False, default=list)
    interaction_checked_at = Column(DateTime(timezone=True), nullable=False)
    override_log_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    user = relationship("User", back_populates="medications")

    __table_args__ = (
        Index("ix_medications_user_created", "user_id", "created_at"),
    )


class MedicationPreference(Base):
    __tablename__ = "medication_preferences"

    user_id = Column(
        String(255),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    breakfast_time = Column(String(5), nullable=False, default="08:00")
    lunch_time = Column(String(5), nullable=False, default="13:00")
    dinner_time = Column(String(5), nullable=False, default="19:00")
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    user = relationship("User", back_populates="medication_preference")
