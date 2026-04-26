from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    age = Column(Integer, nullable=True)
    sex = Column(String, nullable=True)
    weight = Column(Float, nullable=True)
    diabetes = Column(Boolean, default=False)
    hypertension = Column(Boolean, default=False)
    family_history = Column(Boolean, default=False)

    # Recent/Past doctor overview logic
    overview_archived = Column(Boolean, default=False)
    overview_archived_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    readings = relationship("Reading", back_populates="patient", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="patient", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="patient", cascade="all, delete-orphan")