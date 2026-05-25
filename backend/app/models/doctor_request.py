"""
Doctor Request model — connection requests from patients to doctors.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import relationship

from app.database.base import Base


class DoctorRequest(Base):
    __tablename__ = "doctor_requests"

    id = Column(
        String(255),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    patient_id = Column(
        String(255),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    doctor_id = Column(
        String(255),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status = Column(
        String(20),
        nullable=False,
        default="pending",
        comment="pending | accepted | rejected",
    )
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # ── Relationships ────────────────────────────────────────────────────
    patient = relationship(
        "User", back_populates="patient_requests",
        foreign_keys=[patient_id],
    )
    doctor = relationship(
        "User", back_populates="doctor_requests",
        foreign_keys=[doctor_id],
    )

    # ── Indexes ──────────────────────────────────────────────────────────
    __table_args__ = (
        Index("ix_doctor_requests_doctor_status", "doctor_id", "status"),
        Index("ix_doctor_requests_patient_status", "patient_id", "status"),
    )

    def __repr__(self):
        return f"<DoctorRequest {self.id} {self.patient_id}->{self.doctor_id} status={self.status}>"
