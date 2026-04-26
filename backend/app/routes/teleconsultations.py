from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.patient import Patient
from ..models.prediction import Prediction
from ..models.reading import Reading
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


def build_teleconsultation_response(db: Session, item: Teleconsultation) -> TeleconsultationOut:
    patient = db.query(Patient).filter(Patient.id == item.patient_id).first()
    patient_user = None
    if patient and patient.user_id:
        patient_user = db.query(User).filter(User.id == patient.user_id).first()

    doctor_user = db.query(User).filter(User.id == item.doctor_id).first()

    latest_prediction = (
        db.query(Prediction)
        .filter(Prediction.patient_id == item.patient_id)
        .order_by(Prediction.created_at.desc())
        .first()
    )

    latest_reading = (
        db.query(Reading)
        .filter(Reading.patient_id == item.patient_id)
        .order_by(Reading.reading_date.desc())
        .first()
    )

    return TeleconsultationOut(
        id=item.id,
        patient_id=item.patient_id,
        patient_name=patient_user.name if patient_user else None,
        doctor_id=item.doctor_id,
        doctor_name=doctor_user.name if doctor_user else None,
        appointment_time=item.appointment_time,
        meeting_link=item.meeting_link,
        summary=item.summary,
        status=item.status,
        urgency=item.urgency,
        needs_immediate_attention=item.needs_immediate_attention,
        doctor_advice=item.doctor_advice,
        prescription_note=item.prescription_note,
        patient_instruction=item.patient_instruction,
        latest_risk_score=latest_prediction.risk_score if latest_prediction else None,
        latest_risk_level=latest_prediction.risk_level if latest_prediction else None,
        trend_status=latest_prediction.trend_status if latest_prediction else None,
        latest_creatinine=latest_reading.creatinine_value if latest_reading else None,
        latest_acr=latest_reading.acr if latest_reading else None,
        latest_egfr=latest_reading.egfr if latest_reading else None,
        latest_systolic_bp=latest_reading.systolic_bp if latest_reading else None,
        latest_diastolic_bp=latest_reading.diastolic_bp if latest_reading else None,
    )


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
        message=f"Consultation scheduled for {patient_user.name if patient_user else f'patient {patient.id}'} at {item.appointment_time}.",
        type="consultation",
        related_patient_id=patient.id,
    )

    return build_teleconsultation_response(db, item)


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

    rows = (
        db.query(Teleconsultation)
        .filter(Teleconsultation.patient_id == patient_id)
        .order_by(
            Teleconsultation.needs_immediate_attention.desc(),
            Teleconsultation.appointment_time.desc(),
        )
        .all()
    )

    return [build_teleconsultation_response(db, row) for row in rows]


@router.get("/doctor/{doctor_id}", response_model=list[TeleconsultationOut])
def get_for_doctor(
    doctor_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if current_user.role != "doctor" or current_user.id != doctor_id:
        raise HTTPException(status_code=403, detail="Not allowed")

    rows = (
        db.query(Teleconsultation)
        .filter(Teleconsultation.doctor_id == doctor_id)
        .order_by(
            Teleconsultation.needs_immediate_attention.desc(),
            Teleconsultation.appointment_time.desc(),
        )
        .all()
    )

    return [build_teleconsultation_response(db, row) for row in rows]


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
        message=f"Consultation for {patient_user.name if patient_user else f'patient {item.patient_id}'} was updated successfully.",
        type="consultation",
        related_patient_id=item.patient_id,
    )

    return build_teleconsultation_response(db, item)