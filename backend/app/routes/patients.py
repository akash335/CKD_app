from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.patient import Patient
from ..models.user import User
from ..schemas.patient_schema import PatientCreate, PatientUpdate, PatientOut
from .deps import get_current_user

router = APIRouter(prefix="/patients", tags=["patients"])


def build_patient_response(db: Session, patient: Patient):
    user = db.query(User).filter(User.id == patient.user_id).first()

    return {
        "id": patient.id,
        "user_id": patient.user_id,
        "created_at": patient.created_at,

        "age": patient.age,
        "sex": patient.sex,
        "weight": patient.weight,
        "diabetes": patient.diabetes,
        "hypertension": patient.hypertension,
        "family_history": patient.family_history,
        "doctor_id": patient.doctor_id,

        "user_name": user.name if user else None,
        "user_email": user.email if user else None,
    }


@router.post("", response_model=PatientOut)
def create_patient(payload: PatientCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Only patient users can create patient profiles")

    existing = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Patient profile already exists")

    patient = Patient(user_id=current_user.id, **payload.model_dump())
    db.add(patient)
    db.commit()
    db.refresh(patient)

    return build_patient_response(db, patient)


@router.get("", response_model=list[PatientOut])
def list_patients(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role == "patient":
        rows = db.query(Patient).filter(Patient.user_id == current_user.id).all()
    else:
        rows = db.query(Patient).order_by(Patient.created_at.desc()).all()

    return [build_patient_response(db, row) for row in rows]


@router.get("/me", response_model=PatientOut)
def get_my_patient(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    return build_patient_response(db, patient)


@router.get("/{patient_id}", response_model=PatientOut)
def get_patient(patient_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if current_user.role == "patient" and patient.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    return build_patient_response(db, patient)


@router.put("/{patient_id}", response_model=PatientOut)
def update_patient(patient_id: int, payload: PatientUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if current_user.role == "patient" and patient.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(patient, key, value)

    db.commit()
    db.refresh(patient)

    return build_patient_response(db, patient)