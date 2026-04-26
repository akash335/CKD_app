from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.sql import func
from ..database import Base


class Teleconsultation(Base):
    __tablename__ = "teleconsultations"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    appointment_time = Column(DateTime(timezone=True), server_default=func.now())
    meeting_link = Column(String, nullable=True)

    summary = Column(Text, nullable=True)
    status = Column(String, default="scheduled")

    urgency = Column(String, default="routine")
    needs_immediate_attention = Column(Boolean, default=False)

    doctor_advice = Column(Text, nullable=True)
    prescription_note = Column(Text, nullable=True)
    patient_instruction = Column(Text, nullable=True)

    # Recent/Past consultation logic
    is_archived = Column(Boolean, default=False)
    archived_at = Column(DateTime(timezone=True), nullable=True)