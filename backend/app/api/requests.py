"""Doctor-Patient Connection Requests API (database-backed). Trigger reload."""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.requests import ConnectionRequestCreate, ConnectionRequestResponse
from app.services.requests import (
    create_connection_request,
    get_requests_for_doctor,
    get_requests_for_patient,
    accept_request,
    reject_request,
)

from app.services.notifications import create_connection_request_notification, create_connection_accepted_notification
from app.models.user import User

router = APIRouter(prefix="/api/requests", tags=["Requests"])


@router.post("", response_model=ConnectionRequestResponse)
async def create_request(
    data: ConnectionRequestCreate,
    patient_id: str = Query(..., description="ID of the patient"),
    db: Session = Depends(get_db),
):
    """Send a connection request to a doctor using their username."""
    try:
        req = create_connection_request(db, patient_id, data.username)
        # Create in-app notification for the doctor
        try:
            patient = db.query(User).filter(User.id == patient_id).first()
            patient_name = patient.name if patient and patient.name else "A patient"
            create_connection_request_notification(
                db=db,
                doctor_id=req["doctor_id"],
                patient_id=patient_id,
                patient_name=patient_name,
                request_id=req["id"],
            )
        except Exception:
            pass  # Non-critical
        # Re-fetch for response format with patient_name
        reqs = get_requests_for_patient(db, patient_id)
        for r in reqs:
            if r["id"] == req["id"]:
                return r
        raise HTTPException(status_code=500, detail="Failed to create request")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/doctor/{doctor_id}", response_model=List[ConnectionRequestResponse])
async def get_doctor_requests(doctor_id: str, db: Session = Depends(get_db)):
    """Get all incoming connection requests for a doctor."""
    return get_requests_for_doctor(db, doctor_id)


@router.get("/patient/{patient_id}", response_model=List[ConnectionRequestResponse])
async def get_patient_requests(patient_id: str, db: Session = Depends(get_db)):
    """Get all connection requests sent by a patient."""
    return get_requests_for_patient(db, patient_id)


@router.post("/{request_id}/accept", response_model=ConnectionRequestResponse)
async def accept_patient_request(
    request_id: str,
    doctor_id: str = Query(..., description="ID of the doctor"),
    db: Session = Depends(get_db),
):
    """Accept a connection request."""
    try:
        req = accept_request(db, request_id, doctor_id)
        # Create in-app notification for the patient
        try:
            doctor = db.query(User).filter(User.id == doctor_id).first()
            doctor_name = doctor.name if doctor and doctor.name else "Your doctor"
            create_connection_accepted_notification(
                db=db,
                patient_id=req["patient_id"],
                doctor_id=doctor_id,
                doctor_name=doctor_name,
                request_id=request_id,
            )
        except Exception:
            pass  # Non-critical
        reqs = get_requests_for_doctor(db, doctor_id)
        for r in reqs:
            if r["id"] == req["id"]:
                return r
        raise HTTPException(status_code=500, detail="Failed to accept request")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{request_id}/reject", response_model=ConnectionRequestResponse)
async def reject_patient_request(
    request_id: str,
    doctor_id: str = Query(..., description="ID of the doctor"),
    db: Session = Depends(get_db),
):
    """Reject a connection request."""
    try:
        req = reject_request(db, request_id, doctor_id)
        reqs = get_requests_for_doctor(db, doctor_id)
        for r in reqs:
            if r["id"] == req["id"]:
                return r
        raise HTTPException(status_code=500, detail="Failed to reject request")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/unlink")
async def unlink_patient(
    patient_id: str = Query(..., description="ID of the patient"),
    doctor_id: str = Query(..., description="ID of the doctor"),
    db: Session = Depends(get_db),
):
    """Unlink a patient from a doctor."""
    from app.services.requests import remove_patient
    try:
        success = remove_patient(db, patient_id, doctor_id)
        return {"success": success, "message": "Patient unlinked successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{request_id}")
async def delete_patient_request(
    request_id: str,
    patient_id: str = Query(..., description="ID of the patient"),
    db: Session = Depends(get_db),
):
    """Delete a connection request from the patient's view."""
    from app.services.requests import delete_request
    try:
        success = delete_request(db, request_id, patient_id)
        return {"success": success, "message": "Request deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
