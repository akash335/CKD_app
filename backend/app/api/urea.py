"""Urea monitoring API routes."""

from fastapi import APIRouter
from app.schemas.prediction import UreaInput, PredictionResponse
from app.services.prediction import predict_urea

router = APIRouter(prefix="/api/urea", tags=["Urea"])


@router.get("/readings")
async def get_readings():
    """Fetch urea monitor readings for the authenticated patient."""
    return {"readings": [], "total": 0}


@router.post("/predict", response_model=PredictionResponse)
async def predict_from_urea(data: UreaInput):
    """Run CKD prediction from urea-only input."""
    return predict_urea(data)
