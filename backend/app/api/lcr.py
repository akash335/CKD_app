"""LCR sensor data API routes."""

from fastapi import APIRouter
from app.schemas.prediction import LCRInput, PredictionResponse
from app.services.prediction import predict_lcr

router = APIRouter(prefix="/api/lcr", tags=["LCR"])


@router.get("/readings")
async def get_readings():
    """Fetch LCR readings for the authenticated patient."""
    return {"readings": [], "total": 0}


@router.post("/predict", response_model=PredictionResponse)
async def predict_from_lcr(data: LCRInput):
    """Run CKD prediction from LCR sensor data."""
    return predict_lcr(data)
