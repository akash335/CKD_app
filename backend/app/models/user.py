"""
User model — patients and doctors.

Supports both Google OAuth and email/password authentication.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, DateTime, Enum as SAEnum, Boolean, Index, Integer
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(
        String(255),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        comment="Primary key — UUID for credentials, Google ID for OAuth",
    )
    name = Column(String(100), nullable=True)
    age = Column(Integer, nullable=True)
    gender = Column(String(20), nullable=True)
    next_checkup = Column(DateTime, nullable=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True, comment="Null for Google-only users")
    role = Column(
        String(20),
        nullable=False,
        default="",
        comment="patient | doctor | empty (not yet chosen)",
    )
    auth_provider = Column(
        String(20),
        nullable=False,
        default="google",
        comment="google | credentials",
    )
    image = Column(String(512), nullable=True, comment="Profile picture URL")
    username = Column(
        String(50),
        unique=True,
        nullable=True,
        index=True,
        comment="Unique username for users to connect",
    )
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    # ── Relationships ────────────────────────────────────────────────────
    health_records = relationship(
        "HealthRecord", back_populates="user", cascade="all, delete-orphan",
        lazy="dynamic",
    )
    # Requests where this user is the patient
    patient_requests = relationship(
        "DoctorRequest",
        back_populates="patient",
        foreign_keys="DoctorRequest.patient_id",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )
    # Requests where this user is the doctor
    doctor_requests = relationship(
        "DoctorRequest",
        back_populates="doctor",
        foreign_keys="DoctorRequest.doctor_id",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )
    # Doctor-patient links as doctor
    doctor_links = relationship(
        "DoctorPatient",
        back_populates="doctor",
        foreign_keys="DoctorPatient.doctor_id",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )
    # Doctor-patient links as patient
    patient_links = relationship(
        "DoctorPatient",
        back_populates="patient",
        foreign_keys="DoctorPatient.patient_id",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )
    password_resets = relationship(
        "PasswordReset", back_populates="user", cascade="all, delete-orphan",
    )
    medications = relationship(
        "Medication",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )
    medication_preference = relationship(
        "MedicationPreference",
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
    )
    alert_contacts = relationship(
        "AlertContact",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )
    alert_settings = relationship(
        "AlertSettings",
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
    )

    # ── Table-level indexes for dashboard queries ────────────────────────
    __table_args__ = (
        Index("ix_users_role_created", "role", "created_at"),
    )

    def __repr__(self):
        return f"<User {self.id} ({self.email}) role={self.role}>"
