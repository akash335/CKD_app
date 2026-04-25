from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.patient import Patient
from ..models.reading import Reading
from ..schemas.reading_schema import ReadingCreate, ReadingOut
from ..services.prediction_service import run_prediction
from .deps import get_current_user

router = APIRouter(prefix="/readings", tags=["readings"])


@router.post("/{patient_id}", response_model=ReadingOut)
def create_reading(
    patient_id: int,
    payload: ReadingCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if current_user.role == "patient" and patient.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    reading = Reading(
        patient_id=patient_id,
        **payload.model_dump(),
    )

    db.add(reading)
    db.commit()
    db.refresh(reading)

    # ML prediction runs only on the dataset-based CKD fields stored in the reading.
    # report_image_path is only a supporting attachment for doctor/telemedicine review.
    run_prediction(db, patient_id, reading)

    return reading


@router.get("/{patient_id}", response_model=list[ReadingOut])
def get_readings(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if current_user.role == "patient" and patient.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    rows = (
        db.query(Reading)
        .filter(Reading.patient_id == patient_id)
        .order_by(Reading.reading_date.desc())
        .all()
    )
    return rows


@router.get("/latest/{patient_id}", response_model=ReadingOut)
def latest_reading(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if current_user.role == "patient" and patient.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    row = (
        db.query(Reading)
        .filter(Reading.patient_id == patient_id)
        .order_by(Reading.reading_date.desc())
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="No readings found")

    return row