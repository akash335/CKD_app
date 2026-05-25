"""
ML Model service — CRUD for the model registry + prediction creation.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models.ml_model import MLModel
from app.models.prediction import Prediction
from app.models.health_record import HealthRecord


def register_model(
    db: Session,
    name: str,
    version: str,
    description: Optional[str] = None,
) -> MLModel:
    """Register a new ML model version in the registry."""
    model = MLModel(
        id=str(uuid.uuid4()),
        name=name,
        version=version,
        description=description,
        is_active="true",
        created_at=datetime.now(timezone.utc),
    )
    db.add(model)
    db.commit()
    db.refresh(model)
    return model


def get_active_model(db: Session, name: str) -> Optional[MLModel]:
    """Get the latest active model by name."""
    return db.query(MLModel).filter(
        MLModel.name == name,
        MLModel.is_active == "true",
    ).order_by(MLModel.created_at.desc()).first()


def get_all_models(db: Session) -> list[MLModel]:
    """List all registered models."""
    return db.query(MLModel).order_by(MLModel.created_at.desc()).all()


def get_model_by_id(db: Session, model_id: str) -> Optional[MLModel]:
    """Get a model by ID."""
    return db.query(MLModel).filter(MLModel.id == model_id).first()


def create_prediction(
    db: Session,
    record_id: str,
    model_id: Optional[str],
    output: dict,
) -> Prediction:
    """Create a prediction linked to a health record and (optionally) a model."""
    prediction = Prediction(
        id=str(uuid.uuid4()),
        record_id=record_id,
        model_id=model_id,
        output=output,
        created_at=datetime.now(timezone.utc),
    )
    db.add(prediction)
    db.commit()
    db.refresh(prediction)
    return prediction


def get_predictions_by_record(db: Session, record_id: str) -> Optional[Prediction]:
    """Get the prediction for a specific record."""
    return db.query(Prediction).filter(
        Prediction.record_id == record_id,
    ).first()


def get_predictions_by_model(db: Session, model_id: str) -> list[Prediction]:
    """Get all predictions made by a specific model version."""
    return db.query(Prediction).filter(
        Prediction.model_id == model_id,
    ).order_by(Prediction.created_at.desc()).all()


def rerun_prediction(
    db: Session,
    record_id: str,
    new_model_id: str,
    new_output: dict,
) -> Prediction:
    """
    Re-run a prediction on an existing record with a new model.
    
    Replaces the old prediction for that record with a new one.
    This supports model version upgrades.
    """
    # Delete old prediction
    old = db.query(Prediction).filter(Prediction.record_id == record_id).first()
    if old:
        db.delete(old)
        db.flush()

    # Create new prediction
    return create_prediction(db, record_id, new_model_id, new_output)
