from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ReadingCreate(BaseModel):
    creatinine_value: Optional[float] = None
    urine_albumin: Optional[float] = None
    acr: Optional[float] = None
    egfr: Optional[float] = None
    systolic_bp: Optional[float] = None
    diastolic_bp: Optional[float] = None
    glucose: Optional[float] = None
    sensor_value_1: Optional[float] = None
    sensor_value_2: Optional[float] = None

    symptom_fatigue: bool = False
    symptom_swelling: bool = False
    symptom_low_urine: bool = False

    adherence_score: Optional[float] = None
    source: str = "manual"

    # Supporting document path for telemedicine review only
    report_image_path: Optional[str] = None


class ReadingOut(ReadingCreate):
    id: int
    patient_id: int
    reading_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True