"""Schemas for the intelligence layer — recommendations, alerts, insights."""

from pydantic import BaseModel
from typing import Optional


class Recommendation(BaseModel):
    """A single actionable recommendation."""
    id: str
    category: str  # "diet" | "hydration" | "monitoring" | "lifestyle" | "medical"
    title: str
    description: str
    priority: str  # "high" | "medium" | "low"
    icon: str  # emoji identifier for frontend


class Alert(BaseModel):
    """A health alert triggered by data analysis."""
    id: str
    severity: str  # "critical" | "warning" | "info"
    title: str
    message: str
    metric: Optional[str] = None
    action: Optional[str] = None  # suggested action


class IntelligenceReport(BaseModel):
    """Full intelligence report combining all smart features."""
    alerts: list[Alert]
    recommendations: list[Recommendation]
    condition_summary: str  # one-line summary of overall condition
    trend_label: str  # "improving" | "worsening" | "stable" | "insufficient_data"
    risk_level: str
    data_points: int
