from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Reading(Base):
    __tablename__ = "readings"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)

    reading_date = Column(DateTime(timezone=True), server_default=func.now())

    # Dataset-based CKD inputs
    creatinine_value = Column(Float, nullable=True)
    urine_albumin = Column(Float, nullable=True)
    acr = Column(Float, nullable=True)
    egfr = Column(Float, nullable=True)
    systolic_bp = Column(Float, nullable=True)
    diastolic_bp = Column(Float, nullable=True)
    glucose = Column(Float, nullable=True)
    sensor_value_1 = Column(Float, nullable=True)
    sensor_value_2 = Column(Float, nullable=True)

    # Symptoms used in monitoring flow
    symptom_fatigue = Column(Boolean, default=False)
    symptom_swelling = Column(Boolean, default=False)
    symptom_low_urine = Column(Boolean, default=False)

    # Monitoring adherence
    adherence_score = Column(Float, nullable=True)

    # Manual / uploaded / device
    source = Column(String, default="manual")

    # Optional supporting document for doctor review only
    report_image_path = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    patient = relationship("Patient", back_populates="readings")
    prediction = relationship("Prediction", back_populates="reading", uselist=False)