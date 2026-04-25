from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.patient import Patient
from ..models.reading import Reading
from ..models.prediction import Prediction
from ..schemas.prediction_schema import PredictionOut
from ..services.prediction_service import run_prediction
from .deps import get_current_user

router = APIRouter(prefix="/predictions", tags=["predictions"])


@router.post("/run/{patient_id}", response_model=PredictionOut)
def run_for_latest(patient_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    reading = db.query(Reading).filter(Reading.patient_id == patient_id).order_by(Reading.reading_date.desc()).first()
    if not reading:
        raise HTTPException(status_code=404, detail="No reading found")
    return run_prediction(db, patient_id, reading)


@router.get("/{patient_id}", response_model=list[PredictionOut])
def get_predictions(patient_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return db.query(Prediction).filter(Prediction.patient_id == patient_id).order_by(Prediction.created_at.desc()).all()


@router.get("/latest/{patient_id}", response_model=PredictionOut)
def latest_prediction(patient_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    row = db.query(Prediction).filter(Prediction.patient_id == patient_id).order_by(Prediction.created_at.desc()).first()
    if not row:
        raise HTTPException(status_code=404, detail="No predictions found")
    return row
