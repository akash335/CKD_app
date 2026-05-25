"""Records API — CRUD for prediction history + insights + patient list (database-backed)."""

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.records import (
    RecordCreate,
    RecordResponse,
    RecordsListResponse,
    InsightResponse,
    PatientSummary,
)
from app.services.records import (
    save_record,
    get_all_records,
    get_record_by_id,
    get_patients,
    generate_insights,
    trigger_alert_if_high_risk,
    delete_record_by_id,
)

router = APIRouter(prefix="/api/records", tags=["Records"])


@router.post("", response_model=RecordResponse)
async def create_record(data: RecordCreate, db: Session = Depends(get_db)):
    """Save a new prediction record and trigger alerts if risk level is High or Critical."""
    record = save_record(db, data)
    
    # Trigger alert asynchronously if risk level is high or critical
    if record.risk_level.lower() in ("high", "critical"):
        try:
            await trigger_alert_if_high_risk(
                db=db,
                user_id=record.user_id,
                risk_level=record.risk_level,
                explanation=record.explanation
            )
        except Exception as e:
            logging.warning("Alert sending failed: %s", e)
    
    return record


@router.get("", response_model=RecordsListResponse)
async def list_records(
    user_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Fetch prediction records. Filter by user_id for patient mode, omit for doctor mode."""
    records = get_all_records(db, user_id=user_id)
    return RecordsListResponse(records=records, total=len(records))


@router.get("/patients", response_model=list[PatientSummary])
async def list_patients(
    doctor_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Return a list of unique patients derived from records (doctor view)."""
    return get_patients(db, doctor_id)


@router.get("/insights", response_model=list[InsightResponse])
async def get_insights(
    user_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Generate trend insights from record history."""
    return generate_insights(db, user_id=user_id)


@router.get("/{record_id}", response_model=RecordResponse)
async def get_record(record_id: str, db: Session = Depends(get_db)):
    """Fetch a single record by ID."""
    record = get_record_by_id(db, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return record

@router.delete("/{record_id}")
async def delete_record(record_id: str, db: Session = Depends(get_db)):
    """Delete a record by ID."""
    success = delete_record_by_id(db, record_id)
    if not success:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"success": True}
