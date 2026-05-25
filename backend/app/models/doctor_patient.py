"""
Doctor-Patient relationship model — established connections.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, DateTime, ForeignKey, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship

from app.database.base import Base


class DoctorPatient(Base):
    __tablename__ = "doctor_patients"

    id = Column(
        String(255),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    doctor_id = Column(
        String(255),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    patient_id = Column(
        String(255),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # ── Relationships ────────────────────────────────────────────────────
    doctor = relationship(
        "User", back_populates="doctor_links",
        foreign_keys=[doctor_id],
    )
    patient = relationship(
        "User", back_populates="patient_links",
        foreign_keys=[patient_id],
    )

    # ── Constraints & Indexes ────────────────────────────────────────────
    __table_args__ = (
        UniqueConstraint("doctor_id", "patient_id", name="uq_doctor_patient"),
        Index("ix_doctor_patients_doctor", "doctor_id"),
    )

    def __repr__(self):
        return f"<DoctorPatient doctor={self.doctor_id} patient={self.patient_id}>"
