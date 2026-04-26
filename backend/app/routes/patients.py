from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.sql import func

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

        "overview_archived": bool(patient.overview_archived),
        "overview_archived_at": patient.overview_archived_at,

        "user_name": user.name if user else None,
        "user_email": user.email if user else None,
    }


@router.post("", response_model=PatientOut)
def create_patient(
    payload: PatientCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != "patient":
        raise HTTPException(status_code=403, detail="Only patient users can create patient profiles")

    existing = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Patient profile already exists")

    patient = Patient(
        user_id=current_user.id,
        overview_archived=False,
        overview_archived_at=None,
        **payload.model_dump(),
    )

    db.add(patient)
    db.commit()
    db.refresh(patient)

    return build_patient_response(db, patient)


@router.get("", response_model=list[PatientOut])
def list_patients(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role == "patient":
        rows = (
            db.query(Patient)
            .filter(Patient.user_id == current_user.id)
            .order_by(Patient.created_at.desc())
            .all()
        )
    else:
        rows = (
            db.query(Patient)
            .order_by(Patient.created_at.desc())
            .all()
        )

    return [build_patient_response(db, row) for row in rows]


@router.get("/overview/recent", response_model=list[PatientOut])
def list_recent_overview_patients(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can view patient overview")

    rows = (
        db.query(Patient)
        .filter(Patient.overview_archived == False)  # noqa: E712
        .order_by(Patient.created_at.desc())
        .all()
    )

    return [build_patient_response(db, row) for row in rows]


@router.get("/overview/past", response_model=list[PatientOut])
def list_past_overview_patients(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can view past patient overview")

    rows = (
        db.query(Patient)
        .filter(Patient.overview_archived == True)  # noqa: E712
        .order_by(Patient.overview_archived_at.desc().nullslast(), Patient.created_at.desc())
        .all()
    )

    return [build_patient_response(db, row) for row in rows]


@router.put("/overview/archive")
def archive_recent_patient_overview(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != "doctor":
        raise HTTPException(status_code=403, detail="Only doctors can clear patient overview")

    rows = (
        db.query(Patient)
        .filter(Patient.overview_archived == False)  # noqa: E712
        .all()
    )

    for patient in rows:
        patient.overview_archived = True
        patient.overview_archived_at = func.now()

    db.commit()

    return {
        "message": "Recent patient overview moved to past",
        "archived": len(rows),
    }


@router.get("/me", response_model=PatientOut)
def get_my_patient(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    return build_patient_response(db, patient)


@router.get("/{patient_id}", response_model=PatientOut)
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if current_user.role == "patient" and patient.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    return build_patient_response(db, patient)


@router.put("/{patient_id}", response_model=PatientOut)
def update_patient(
    patient_id: int,
    payload: PatientUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
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