"""
Prediction model — stores ML model output separately from input.

Linked to a health record (1:1) and an ML model version.
Output is stored as JSON so prediction schema can work with SQLite locally.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, DateTime, ForeignKey, Index, JSON
)
from sqlalchemy.orm import relationship

from app.database.base import Base


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(
        String(255),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    record_id = Column(
        String(255),
        ForeignKey("health_records.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
        comment="One prediction per record",
    )

    model_id = Column(
        String(255),
        ForeignKey("ml_models.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="Which ML model version produced this prediction",
    )

    output = Column(
        JSON,
        nullable=False,
        comment="Prediction result: risk_level, confidence, health_score, explanation, factors",
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    record = relationship("HealthRecord", back_populates="prediction")
    model = relationship("MLModel", back_populates="predictions")

    # Indexes
    __table_args__ = (
        Index("ix_predictions_model_created", "model_id", "created_at"),
    )

    def __repr__(self):
        return f"<Prediction {self.id} record={self.record_id} model={self.model_id}>"