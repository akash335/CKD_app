"""Pydantic schemas for prediction requests and responses."""

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class RiskLevel(str, Enum):
    low = "low"
    moderate = "moderate"
    high = "high"
    critical = "critical"


# ── Request Schemas ─────────────────────────────────────────────────────────

class HospitalInput(BaseModel):
    creatinine: float = Field(..., ge=0.1, le=30.0, description="Serum creatinine in mg/dL")
    urea: float = Field(..., ge=1.0, le=300.0, description="Blood urea in mg/dL")
    egfr: float = Field(..., ge=1.0, le=150.0, description="Estimated GFR in mL/min")
    hemoglobin: float = Field(..., ge=2.0, le=25.0, description="Hemoglobin in g/dL")
    age: Optional[int] = Field(None, ge=1, le=120, description="Patient age in years")


class UreaInput(BaseModel):
    urea: float = Field(..., ge=1.0, le=300.0, description="Blood urea in mg/dL")


class LCRInput(BaseModel):
    resistance: float = Field(..., ge=0.0, le=10000.0, description="Resistance (R) in ohms")
    capacitance: float = Field(..., ge=0.0, le=1000.0, description="Capacitance (C) in µF")
    inductance: float = Field(..., ge=0.0, le=1000.0, description="Inductance (L) in mH")


# ── Response Schema ─────────────────────────────────────────────────────────

class PredictionResponse(BaseModel):
    risk_level: RiskLevel
    confidence: float = Field(..., ge=0.0, le=100.0)
    health_score: int = Field(..., ge=0, le=100)
    explanation: str
    contributing_factors: list[str]
    input_mode: str
