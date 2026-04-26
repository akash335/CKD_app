from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class TeleconsultationOut(BaseModel):
    id: int
    patient_id: int
    doctor_id: int

    appointment_time: datetime
    meeting_link: Optional[str] = None

    summary: Optional[str] = None
    status: str
    urgency: str
    needs_immediate_attention: bool

    doctor_advice: Optional[str] = None
    prescription_note: Optional[str] = None
    patient_instruction: Optional[str] = None

    # ✅ NAMES (FIX)
    patient_name: Optional[str] = None
    doctor_name: Optional[str] = None

    # ✅ HEALTH OVERVIEW (FIX)
    latest_risk_score: Optional[float] = None
    latest_risk_level: Optional[str] = None
    trend_status: Optional[str] = None

    latest_creatinine: Optional[float] = None
    latest_acr: Optional[float] = None
    latest_egfr: Optional[float] = None

    latest_systolic_bp: Optional[int] = None
    latest_diastolic_bp: Optional[int] = None

    class Config:
        from_attributes = True