"""
Database-backed doctor-patient connection request service.

Replaces the in-memory dict/list store with PostgreSQL queries.
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import or_, and_
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.doctor_request import DoctorRequest
from app.models.doctor_patient import DoctorPatient


def get_doctor_by_username(db: Session, username: str) -> Optional[str]:
    """Find a doctor's user ID by their unique username."""
    user = db.query(User).filter(
        User.role == "doctor",
        User.username == username,
    ).first()
    return user.id if user else None


def create_connection_request(db: Session, patient_id: str, username: str) -> dict:
    """Create a new connection request from patient to doctor."""
    doctor_id = get_doctor_by_username(db, username)
    if not doctor_id:
        raise ValueError("Doctor not found with that username.")

    # Check if already connected (in either direction)
    existing_link = db.query(DoctorPatient).filter(
        or_(
            and_(DoctorPatient.doctor_id == doctor_id, DoctorPatient.patient_id == patient_id),
            and_(DoctorPatient.doctor_id == patient_id, DoctorPatient.patient_id == doctor_id)
        )
    ).first()
    if existing_link:
        raise ValueError("Already connected with this user.")

    # Check if request is already pending
    existing_req = db.query(DoctorRequest).filter(
        DoctorRequest.patient_id == patient_id,
        DoctorRequest.doctor_id == doctor_id,
        DoctorRequest.status == "pending",
    ).first()
    if existing_req:
        raise ValueError("A connection request is already pending.")

    req = DoctorRequest(
        id=str(uuid.uuid4()),
        patient_id=patient_id,
        doctor_id=doctor_id,
        status="pending",
        created_at=datetime.now(timezone.utc),
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    return {
        "id": req.id,
        "patient_id": req.patient_id,
        "doctor_id": req.doctor_id,
        "status": req.status,
        "created_at": req.created_at.isoformat(),
    }


def get_requests_for_doctor(db: Session, doctor_id: str) -> List[dict]:
    """Get all incoming connection requests for a doctor.
    
    Optimized: batch-loads all patient users in 1 query instead of N.
    """
    requests = db.query(DoctorRequest).filter(
        DoctorRequest.doctor_id == doctor_id,
    ).order_by(DoctorRequest.created_at.desc()).all()

    if not requests:
        return []

    # Batch-load all referenced patients in ONE query
    patient_ids = {req.patient_id for req in requests}
    patients = db.query(User).filter(User.id.in_(patient_ids)).all()
    patient_map: dict[str, User] = {u.id: u for u in patients}

    result = []
    for req in requests:
        patient = patient_map.get(req.patient_id)
        result.append({
            "id": req.id,
            "patient_id": req.patient_id,
            "patient_name": patient.name if patient and patient.name else "Unknown Patient",
            "doctor_id": req.doctor_id,
            "status": req.status,
            "created_at": req.created_at.isoformat(),
        })
    return result


def get_requests_for_patient(db: Session, patient_id: str) -> List[dict]:
    """Get all connection requests sent by a patient.
    
    Optimized: batch-loads all referenced users (doctors + patient) in 1 query
    instead of 2N queries (doctor + patient per request).
    """
    requests = db.query(DoctorRequest).filter(
        DoctorRequest.patient_id == patient_id,
    ).order_by(DoctorRequest.created_at.desc()).all()

    if not requests:
        return []

    # Collect ALL user IDs referenced by these requests
    user_ids = {req.doctor_id for req in requests}
    user_ids.add(patient_id)

    # ONE query for all users
    users = db.query(User).filter(User.id.in_(user_ids)).all()
    user_map: dict[str, User] = {u.id: u for u in users}

    patient_user = user_map.get(patient_id)
    p_name = patient_user.name if patient_user and patient_user.name else "Unknown Patient"

    result = []
    for req in requests:
        doctor = user_map.get(req.doctor_id)
        result.append({
            "id": req.id,
            "patient_id": req.patient_id,
            "patient_name": p_name,
            "doctor_id": req.doctor_id,
            "doctor_name": doctor.name if doctor and doctor.name else "Unknown Doctor",
            "username": doctor.username if doctor else None,
            "status": req.status,
            "created_at": req.created_at.isoformat(),
        })
    return result


def accept_request(db: Session, req_id: str, doctor_id: str) -> dict:
    """Accept a connection request and create the doctor-patient link."""
    req = db.query(DoctorRequest).filter(
        DoctorRequest.id == req_id,
        DoctorRequest.doctor_id == doctor_id,
    ).first()
    if not req:
        raise ValueError("Request not found.")

    req.status = "accepted"

    # Create the doctor-patient relationship if not exists (check both directions)
    existing_link = db.query(DoctorPatient).filter(
        or_(
            and_(DoctorPatient.doctor_id == req.doctor_id, DoctorPatient.patient_id == req.patient_id),
            and_(DoctorPatient.doctor_id == req.patient_id, DoctorPatient.patient_id == req.doctor_id)
        )
    ).first()
    if not existing_link:
        link = DoctorPatient(
            id=str(uuid.uuid4()),
            doctor_id=req.doctor_id,
            patient_id=req.patient_id,
            created_at=datetime.now(timezone.utc),
        )
        db.add(link)

    db.commit()
    db.refresh(req)

    return {
        "id": req.id,
        "patient_id": req.patient_id,
        "doctor_id": req.doctor_id,
        "status": req.status,
        "created_at": req.created_at.isoformat(),
    }


def reject_request(db: Session, req_id: str, doctor_id: str) -> dict:
    """Reject a connection request."""
    req = db.query(DoctorRequest).filter(
        DoctorRequest.id == req_id,
        DoctorRequest.doctor_id == doctor_id,
    ).first()
    if not req:
        raise ValueError("Request not found.")

    req.status = "rejected"
    db.commit()
    db.refresh(req)

    return {
        "id": req.id,
        "patient_id": req.patient_id,
        "doctor_id": req.doctor_id,
        "status": req.status,
        "created_at": req.created_at.isoformat(),
    }


def get_linked_patients(db: Session, doctor_id: str) -> List[str]:
    """Get all patient IDs linked to a doctor."""
    links = db.query(DoctorPatient.patient_id).filter(
        DoctorPatient.doctor_id == doctor_id,
    ).all()
    return [link.patient_id for link in links]


def get_linked_doctors(db: Session, patient_id: str) -> List[str]:
    """Get all doctor IDs linked to a patient."""
    links = db.query(DoctorPatient.doctor_id).filter(
        DoctorPatient.patient_id == patient_id,
    ).all()
    return [link.doctor_id for link in links]


def remove_patient(db: Session, patient_id: str, doctor_id: str) -> bool:
    """Unlink a patient from a doctor."""
    link = db.query(DoctorPatient).filter(
        or_(
            and_(DoctorPatient.patient_id == patient_id, DoctorPatient.doctor_id == doctor_id),
            and_(DoctorPatient.patient_id == doctor_id, DoctorPatient.doctor_id == patient_id)
        )
    ).first()
    if not link:
        raise ValueError("Relationship not found.")

    db.delete(link)

    # Optional: We could also update the status of the original request to 'removed' or something,
    # but deleting the link is sufficient to sever the connection.
    req = db.query(DoctorRequest).filter(
        or_(
            and_(DoctorRequest.patient_id == patient_id, DoctorRequest.doctor_id == doctor_id),
            and_(DoctorRequest.patient_id == doctor_id, DoctorRequest.doctor_id == patient_id)
        ),
        DoctorRequest.status == "accepted",
    ).first()
    if req:
        req.status = "removed"

    db.commit()
    return True

def delete_request(db: Session, req_id: str, patient_id: str) -> bool:
    """Delete a connection request from the patient's side."""
    req = db.query(DoctorRequest).filter(
        DoctorRequest.id == req_id,
        DoctorRequest.patient_id == patient_id,
    ).first()
    if not req:
        raise ValueError("Request not found.")
        
    db.delete(req)
    db.commit()
    return True
