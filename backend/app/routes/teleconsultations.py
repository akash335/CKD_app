from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.patient import Patient
from ..models.teleconsultation import Teleconsultation
from ..models.user import User
from ..schemas.teleconsultation_schema import (
    TeleconsultationCreate,
    TeleconsultationOut,
    TeleconsultationUpdate,
)
from ..services.email_service import send_patient_consultation_email
from ..services.notification_service import create_notification
from .deps import get_current_user

router = APIRouter(prefix="/teleconsultations", tags=["teleconsultations"])


@router.post("", response_model=TeleconsultationOut)
def create_teleconsultation(
    payload: TeleconsultationCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != "doctor":
        raise HTTPException(
            status_code=403,
            detail="Only doctors can schedule teleconsultations",
        )

    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    doctor = db.query(User).filter(User.id == payload.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    item = Teleconsultation(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)

    patient_user = db.query(User).filter(User.id == patient.user_id).first()

    if patient_user and patient_user.email:
        send_patient_consultation_email(
            patient_email=patient_user.email,
            patient_name=patient_user.name,
            appointment_time=str(item.appointment_time),
            meeting_link=item.meeting_link,
            doctor_advice=getattr(item, "doctor_advice", None),
            prescription_note=getattr(item, "prescription_note", None),
            patient_instruction=getattr(item, "patient_instruction", None),
        )

    if patient_user:
        create_notification(
            db=db,
            user_id=patient_user.id,
            title="Consultation scheduled",
            message=f"Your CKD consultation is scheduled for {item.appointment_time}.",
            type="consultation",
            related_patient_id=patient.id,
        )

    create_notification(
        db=db,
        user_id=doctor.id,
        title="Consultation created",
        message=f"Consultation scheduled for patient {patient.id} at {item.appointment_time}.",
        type="consultation",
        related_patient_id=patient.id,
    )

    return item


@router.get("/patient/{patient_id}", response_model=list[TeleconsultationOut])
def get_for_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    if current_user.role == "patient" and patient.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    return (
        db.query(Teleconsultation)
        .filter(Teleconsultation.patient_id == patient_id)
        .order_by(
            Teleconsultation.needs_immediate_attention.desc(),
            Teleconsultation.appointment_time.asc(),
        )
        .all()
    )


@router.get("/doctor/{doctor_id}", response_model=list[TeleconsultationOut])
def get_for_doctor(
    doctor_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != "doctor" or current_user.id != doctor_id:
        raise HTTPException(status_code=403, detail="Not allowed")

    return (
        db.query(Teleconsultation)
        .filter(Teleconsultation.doctor_id == doctor_id)
        .order_by(
            Teleconsultation.needs_immediate_attention.desc(),
            Teleconsultation.appointment_time.asc(),
        )
        .all()
    )


@router.put("/{consultation_id}", response_model=TeleconsultationOut)
def update_teleconsultation(
    consultation_id: int,
    payload: TeleconsultationUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    item = (
        db.query(Teleconsultation)
        .filter(Teleconsultation.id == consultation_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Teleconsultation not found")

    if current_user.role != "doctor" or current_user.id != item.doctor_id:
        raise HTTPException(status_code=403, detail="Not allowed")

    for key, value in payload.model_dump(exclude_none=True).items():
        setattr(item, key, value)

    db.commit()
    db.refresh(item)

    patient = db.query(Patient).filter(Patient.id == item.patient_id).first()
    patient_user = None
    if patient:
        patient_user = db.query(User).filter(User.id == patient.user_id).first()

    if patient_user:
        create_notification(
            db=db,
            user_id=patient_user.id,
            title="Consultation updated",
            message=f"Your CKD consultation details were updated. Current status: {item.status}.",
            type="consultation",
            related_patient_id=item.patient_id,
        )

    create_notification(
        db=db,
        user_id=item.doctor_id,
        title="Consultation updated",
        message=f"Consultation for patient {item.patient_id} was updated successfully.",
        type="consultation",
        related_patient_id=item.patient_id,
    )

    return item