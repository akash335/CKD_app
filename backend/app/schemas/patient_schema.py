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


class PatientOut(BaseModel):
    id: int
    user_id: int
    created_at: datetime

    age: Optional[int] = None
    sex: Optional[str] = None
    weight: Optional[float] = None
    diabetes: bool = False
    hypertension: bool = False
    family_history: bool = False
    doctor_id: Optional[int] = None

    overview_archived: bool = False
    overview_archived_at: Optional[datetime] = None

    user_name: Optional[str] = None
    user_email: Optional[str] = None

    class Config:
        from_attributes = True