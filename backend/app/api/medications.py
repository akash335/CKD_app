"""Medication management API."""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.medications import (
    MedicationCreate,
    MedicationDeleteResponse,
    MedicationPreferenceResponse,
    MedicationPreferenceUpdate,
    MedicationResponse,
    MedicationUpdate,
)
from app.services.medications import (
    create_medication,
    delete_medication,
    get_preferences,
    list_medications,
    update_preferences,
    update_medication,
)

router = APIRouter(prefix="/api/medications", tags=["Medications"])


@router.get("", response_model=list[MedicationResponse])
async def get_medications(
    user_id: str = Query(..., description="Current user ID"),
    db: Session = Depends(get_db),
):
    try:
        return list_medications(db, user_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("", response_model=MedicationResponse)
async def add_medication(
    payload: MedicationCreate,
    user_id: str = Query(..., description="Current user ID"),
    db: Session = Depends(get_db),
):
    try:
        return create_medication(db, user_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.delete("/{medication_id}", response_model=MedicationDeleteResponse)
async def remove_medication(
    medication_id: str,
    user_id: str = Query(..., description="Current user ID"),
    db: Session = Depends(get_db),
):
    try:
        return delete_medication(db, medication_id, user_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.put("/{medication_id}", response_model=MedicationResponse)
async def update_medication_entry(
    medication_id: str,
    payload: MedicationUpdate,
    user_id: str = Query(..., description="Current user ID"),
    db: Session = Depends(get_db),
):
    try:
        return update_medication(db, medication_id, user_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.get("/preferences", response_model=MedicationPreferenceResponse)
async def get_medication_preferences(
    user_id: str = Query(..., description="Current user ID"),
    db: Session = Depends(get_db),
):
    try:
        return get_preferences(db, user_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.put("/preferences", response_model=MedicationPreferenceResponse)
async def save_medication_preferences(
    payload: MedicationPreferenceUpdate,
    user_id: str = Query(..., description="Current user ID"),
    db: Session = Depends(get_db),
):
    try:
        return update_preferences(db, user_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
