"""
ML Model registry — tracks model versions for prediction auditing.

Allows multiple model versions to coexist and supports re-running
old predictions with newer models.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, Text, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database.base import Base


class MLModel(Base):
    __tablename__ = "ml_models"

    id = Column(
        String(255),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    name = Column(
        String(100),
        nullable=False,
        comment="Model name, e.g. 'ckd_risk_hospital', 'ckd_risk_urea'",
    )
    version = Column(
        String(50),
        nullable=False,
        comment="Semantic version, e.g. '1.0.0', '2.1.0-beta'",
    )
    description = Column(
        Text,
        nullable=True,
        comment="What this model does, training details, etc.",
    )
    is_active = Column(
        String(5),
        nullable=False,
        default="true",
        comment="Whether this model version is currently active for predictions",
    )
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    # ── Relationships ────────────────────────────────────────────────────
    predictions = relationship(
        "Prediction", back_populates="model", lazy="dynamic",
    )

    # ── Constraints ──────────────────────────────────────────────────────
    __table_args__ = (
        UniqueConstraint("name", "version", name="uq_ml_model_name_version"),
    )

    def __repr__(self):
        return f"<MLModel {self.name} v{self.version}>"
