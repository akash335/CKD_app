"""Pydantic schemas for prediction records (history storage)."""

from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime


class RecordCreate(BaseModel):
    """Schema for saving a new prediction record."""
    input_mode: str = Field(..., description="hospital | urea | lcr")
    input_values: dict[str, Any] = Field(..., description="Raw input data")
    risk_level: str
    confidence: float
    health_score: int
    explanation: str
    contributing_factors: list[str]
    user_id: Optional[str] = Field(None, description="User who created the record")


class RecordResponse(BaseModel):
    """Schema for a stored prediction record."""
    id: str
    input_mode: str
    input_values: dict[str, Any]
    risk_level: str
    confidence: float
    health_score: int
    explanation: str
    contributing_factors: list[str]
    created_at: str  # ISO 8601
    user_id: str


class RecordsListResponse(BaseModel):
    """Paginated list of records."""
    records: list[RecordResponse]
    total: int


class InsightResponse(BaseModel):
    """Generated insight from record history."""
    metric: str
    trend: str  # "increasing" | "decreasing" | "stable"
    message: str
    severity: str  # "info" | "warning" | "positive"


class PatientSummary(BaseModel):
    """Summary of a single patient for doctor view."""
    user_id: str
    display_name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    record_count: int
    latest_risk_level: str
    latest_health_score: int
    latest_confidence: float
    last_updated: str  # ISO 8601
