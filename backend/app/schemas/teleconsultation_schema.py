from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class TeleconsultationCreate(BaseModel):
    patient_id: int
    doctor_id: int
    appointment_time: datetime
    meeting_link: Optional[str] = None
    summary: Optional[str] = None
    status: str = Field(default="scheduled")
    urgency: str = Field(default="routine")
    needs_immediate_attention: bool = False
    doctor_advice: Optional[str] = None
    prescription_note: Optional[str] = None
    patient_instruction: Optional[str] = None


class TeleconsultationUpdate(BaseModel):
    appointment_time: Optional[datetime] = None
    meeting_link: Optional[str] = None
    summary: Optional[str] = None
    status: Optional[str] = None
    urgency: Optional[str] = None
    needs_immediate_attention: Optional[bool] = None
    doctor_advice: Optional[str] = None
    prescription_note: Optional[str] = None
    patient_instruction: Optional[str] = None


class TeleconsultationOut(BaseModel):
    id: int
    patient_id: int
    patient_name: Optional[str] = None
    doctor_id: int
    doctor_name: Optional[str] = None

    appointment_time: datetime
    meeting_link: Optional[str] = None
    summary: Optional[str] = None
    status: str
    urgency: str
    needs_immediate_attention: bool

    doctor_advice: Optional[str] = None
    prescription_note: Optional[str] = None
    patient_instruction: Optional[str] = None

    latest_risk_score: Optional[float] = None
    latest_risk_level: Optional[str] = None
    trend_status: Optional[str] = None

    latest_creatinine: Optional[float] = None
    latest_acr: Optional[float] = None
    latest_egfr: Optional[float] = None
    latest_systolic_bp: Optional[float] = None
    latest_diastolic_bp: Optional[float] = None

    class Config:
        from_attributes = True