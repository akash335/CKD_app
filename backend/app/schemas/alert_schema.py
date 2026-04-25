from pydantic import BaseModel
from datetime import datetime


class AlertOut(BaseModel):
    id: int
    patient_id: int
    prediction_id: int | None = None
    alert_type: str
    message: str
    severity: str
    is_resolved: bool
    created_at: datetime

    class Config:
        from_attributes = True
