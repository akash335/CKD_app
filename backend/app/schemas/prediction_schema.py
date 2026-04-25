from pydantic import BaseModel, ConfigDict
from datetime import datetime


class PredictionOut(BaseModel):
    id: int
    patient_id: int
    reading_id: int
    risk_score: float
    risk_level: str
    model_confidence: float
    explanation: str | None = None
    trend_status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, protected_namespaces=())
