from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr

class AlertContactBase(BaseModel):
    name: str
    email: EmailStr
    relation: str

class AlertContactCreate(AlertContactBase):
    pass

class AlertContactResponse(AlertContactBase):
    id: str
    user_id: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class AlertSettingsBase(BaseModel):
    enable_email_alerts: bool
    cooldown_hours: int

class AlertSettingsUpdate(BaseModel):
    enable_email_alerts: Optional[bool] = None
    cooldown_hours: Optional[int] = None

class AlertSettingsResponse(AlertSettingsBase):
    id: str
    user_id: str
    last_alert_sent_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AlertTriggerRequest(BaseModel):
    """Request schema to trigger alert notification."""
    risk_level: str  # low | moderate | high | critical
    explanation: str  # Description of why alert was triggered

class AlertSendResponse(BaseModel):
    """Response from alert sending."""
    status: str  # success | error | skipped
    reason: Optional[str] = None
    recipients: Optional[int] = None
