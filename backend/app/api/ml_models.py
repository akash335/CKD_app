"""ML Models API — model registry and prediction management."""

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel

from app.database.session import get_db
from app.services.ml_models import (
    register_model,
    get_active_model,
    get_all_models,
    get_model_by_id,
    get_predictions_by_model,
    rerun_prediction,
)


# ── Schemas ──────────────────────────────────────────────────────────────

class MLModelCreate(BaseModel):
    name: str
    version: str
    description: Optional[str] = None


class MLModelResponse(BaseModel):
    id: str
    name: str
    version: str
    description: Optional[str] = None
    is_active: str
    created_at: str

    class Config:
        from_attributes = True


class RerunRequest(BaseModel):
    record_id: str
    model_id: str
    output: dict


# ── Routes ───────────────────────────────────────────────────────────────

router = APIRouter(prefix="/api/ml-models", tags=["ML Models"])


@router.post("", response_model=MLModelResponse, status_code=201)
async def create_model(data: MLModelCreate, db: Session = Depends(get_db)):
    """Register a new ML model version."""
    model = register_model(db, data.name, data.version, data.description)
    return MLModelResponse(
        id=model.id,
        name=model.name,
        version=model.version,
        description=model.description,
        is_active=model.is_active,
        created_at=model.created_at.isoformat(),
    )


@router.get("", response_model=list[MLModelResponse])
async def list_models(db: Session = Depends(get_db)):
    """List all registered models."""
    models = get_all_models(db)
    return [
        MLModelResponse(
            id=m.id,
            name=m.name,
            version=m.version,
            description=m.description,
            is_active=m.is_active,
            created_at=m.created_at.isoformat(),
        )
        for m in models
    ]


@router.get("/active")
async def get_active(name: str = Query(...), db: Session = Depends(get_db)):
    """Get the current active model by name."""
    model = get_active_model(db, name)
    if not model:
        raise HTTPException(status_code=404, detail=f"No active model found with name '{name}'")
    return MLModelResponse(
        id=model.id,
        name=model.name,
        version=model.version,
        description=model.description,
        is_active=model.is_active,
        created_at=model.created_at.isoformat(),
    )


@router.post("/rerun-prediction")
async def rerun(data: RerunRequest, db: Session = Depends(get_db)):
    """Re-run a prediction on an existing record with a new model version."""
    prediction = rerun_prediction(db, data.record_id, data.model_id, data.output)
    return {
        "id": prediction.id,
        "record_id": prediction.record_id,
        "model_id": prediction.model_id,
        "output": prediction.output,
        "created_at": prediction.created_at.isoformat(),
    }
