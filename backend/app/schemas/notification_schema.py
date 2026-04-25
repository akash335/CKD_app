from datetime import datetime
from pydantic import BaseModel


class NotificationOut(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    type: str
    is_read: bool
    related_patient_id: int | None = None
    created_at: datetime

    class Config:
        from_attributes = True