"""Schemas for doctor-patient connection requests."""

from pydantic import BaseModel
from typing import Optional

class ConnectionRequestCreate(BaseModel):
    username: str

class ConnectionRequestResponse(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    doctor_id: str
    doctor_name: Optional[str] = None
    username: Optional[str] = None
    status: str
    created_at: str

class ConnectionStatusResponse(BaseModel):
    status: str
