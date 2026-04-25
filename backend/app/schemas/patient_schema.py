from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PatientCreate(BaseModel):
    age: Optional[int] = None
    sex: Optional[str] = None
    weight: Optional[float] = None
    diabetes: bool = False
    hypertension: bool = False
    family_history: bool = False
    doctor_id: Optional[int] = None


class PatientUpdate(PatientCreate):
    pass


class PatientOut(PatientCreate):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True
