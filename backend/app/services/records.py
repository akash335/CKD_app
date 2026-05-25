"""
Database-backed records service — CRUD + insights generation.

Replaces the in-memory list store with PostgreSQL queries.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc

from app.models.health_record import HealthRecord
from app.models.prediction import Prediction
from app.models.user import User
from app.models.doctor_patient import DoctorPatient
from app.schemas.records import (
    RecordCreate, RecordResponse, InsightResponse, PatientSummary,
)


def _record_to_response(record: HealthRecord) -> RecordResponse:
    """Convert a HealthRecord + its Prediction into the legacy RecordResponse."""
    pred = record.prediction
    output = pred.output if pred else {}

    return RecordResponse(
        id=record.id,
        input_mode=record.input_type,
        input_values=record.raw_input,
        risk_level=output.get("risk_level", "low"),
        confidence=output.get("confidence", 0),
        health_score=output.get("health_score", 100),
        explanation=output.get("explanation", ""),
        contributing_factors=output.get("contributing_factors", []),
        created_at=record.created_at.isoformat() if record.created_at else "",
        user_id=record.user_id,
    )


def save_record(db: Session, data: RecordCreate, default_user_id: str = "patient-001") -> RecordResponse:
    """Save a new health record + prediction and return the combined response."""
    user_id = data.user_id or default_user_id

    # 1) Create the health record
    record = HealthRecord(
        id=str(uuid.uuid4())[:8],
        user_id=user_id,
        input_type=data.input_mode,
        raw_input=data.input_values,
        created_at=datetime.now(timezone.utc),
    )
    db.add(record)
    db.flush()  # get the record.id before creating prediction

    # 2) Create the prediction linked to this record
    prediction = Prediction(
        id=str(uuid.uuid4())[:8],
        record_id=record.id,
        model_id=None,  # model registry ID (optional — model loaded globally)
        output={
            "risk_level": data.risk_level,
            "confidence": data.confidence,
            "health_score": data.health_score,
            "explanation": data.explanation,
            "contributing_factors": data.contributing_factors,
        },
        created_at=datetime.now(timezone.utc),
    )
    db.add(prediction)
    db.commit()
    db.refresh(record)

    return _record_to_response(record)


def get_all_records(db: Session, user_id: Optional[str] = None) -> list[RecordResponse]:
    """Return records, optionally filtered by user_id. Newest first.
    
    Uses joinedload to fetch predictions in the same query (avoids N+1).
    """
    query = (
        db.query(HealthRecord)
        .options(joinedload(HealthRecord.prediction))
        .order_by(desc(HealthRecord.created_at))
    )
    if user_id:
        query = query.filter(HealthRecord.user_id == user_id)
    records = query.all()
    return [_record_to_response(r) for r in records]


def get_record_by_id(db: Session, record_id: str) -> Optional[RecordResponse]:
    """Find a single record by ID."""
    record = db.query(HealthRecord).filter(HealthRecord.id == record_id).first()
    if record:
        return _record_to_response(record)
    return None

def delete_record_by_id(db: Session, record_id: str) -> bool:
    """Delete a record by ID. Returns True if deleted, False if not found."""
    try:
        record = db.query(HealthRecord).filter(HealthRecord.id == record_id).first()
        if record:
            # Explicitly delete the prediction first if it exists (extra safety)
            if record.prediction:
                db.delete(record.prediction)
            
            db.delete(record)
            db.commit()
            return True
        return False
    except Exception as e:
        db.rollback()
        logging.error("Error deleting record %s: %s", record_id, e)
        raise e


def get_patients(db: Session, doctor_id: Optional[str] = None) -> list[PatientSummary]:
    """Return a list of unique patients (doctor dashboard view).
    
    Optimized: batch-loads all users in a single query instead of N+1.
    Uses joinedload for predictions. Single-pass grouping via dict.
    """
    # Get linked patient IDs if doctor_id is provided
    allowed_patients: set[str] | None = None
    if doctor_id:
        links = db.query(DoctorPatient.patient_id).filter(
            DoctorPatient.doctor_id == doctor_id
        ).all()
        allowed_patients = {link.patient_id for link in links}

    # Fetch records with predictions in one query (no N+1)
    query = (
        db.query(HealthRecord)
        .options(joinedload(HealthRecord.prediction))
        .order_by(desc(HealthRecord.created_at))
    )
    if allowed_patients is not None:
        query = query.filter(HealthRecord.user_id.in_(allowed_patients))
    records = query.all()

    # Single-pass grouping by user_id — O(N) time, O(K) space (K = unique users)
    patient_map: dict[str, list[HealthRecord]] = {}
    all_user_ids: set[str] = set()
    for r in records:
        patient_map.setdefault(r.user_id, []).append(r)
        all_user_ids.add(r.user_id)

    # Include linked patients with no records
    if allowed_patients:
        for pid in allowed_patients:
            if pid not in patient_map:
                patient_map[pid] = []
            all_user_ids.add(pid)

    # *** KEY OPTIMIZATION: batch-load all users in ONE query ***
    # Before: db.query(User).filter(User.id == uid) inside loop = O(N) queries
    # After:  db.query(User).filter(User.id.in_(ids)) = 1 query, O(1) dict lookup
    user_rows = db.query(User).filter(User.id.in_(all_user_ids)).all() if all_user_ids else []
    user_lookup: dict[str, User] = {u.id: u for u in user_rows}

    # Build summaries in a single pass — O(K)
    risk_order = {"critical": 0, "high": 1, "moderate": 2, "low": 3}
    summaries: list[PatientSummary] = []
    for uid, recs in patient_map.items():
        user = user_lookup.get(uid)
        display_name = user.name if user and user.name else f"Patient {uid[-3:]}"
        user_age = user.age if user else None
        user_gender = user.gender if user else None

        if recs:
            latest = recs[0]
            output = latest.prediction.output if latest.prediction else {}
            summaries.append(PatientSummary(
                user_id=uid,
                display_name=display_name,
                age=user_age,
                gender=user_gender,
                record_count=len(recs),
                latest_risk_level=output.get("risk_level", "low"),
                latest_health_score=output.get("health_score", 100),
                latest_confidence=output.get("confidence", 0),
                last_updated=latest.created_at.isoformat() if latest.created_at else "",
            ))
        else:
            summaries.append(PatientSummary(
                user_id=uid,
                display_name=display_name,
                age=user_age,
                gender=user_gender,
                record_count=0,
                latest_risk_level="low",
                latest_health_score=100,
                latest_confidence=0,
                last_updated="",
            ))

    summaries.sort(key=lambda p: risk_order.get(p.latest_risk_level, 4))
    return summaries


def generate_insights(db: Session, user_id: Optional[str] = None) -> list[InsightResponse]:
    """Analyze record history and generate trend insights.
    
    Optimized: single query with joinedload, single-pass extraction of
    metric values using early termination (only need latest 5 per metric).
    """
    query = (
        db.query(HealthRecord)
        .options(joinedload(HealthRecord.prediction))
        .order_by(desc(HealthRecord.created_at))
    )
    if user_id:
        query = query.filter(HealthRecord.user_id == user_id)
    records = query.all()

    insights: list[InsightResponse] = []

    # ── Single-pass extraction of all metric values ──────────────────────
    # Instead of filtering records 3 times, extract everything in one loop.
    creat_values: list[float] = []
    egfr_values: list[float] = []
    urea_values: list[float] = []
    risk_levels: list[str] = []
    MAX_TREND = 5  # only need latest 5 for trend detection

    for r in records:
        raw = r.raw_input or {}

        # Hospital metrics
        if r.input_type == "hospital" and len(creat_values) < MAX_TREND:
            c = raw.get("creatinine")
            if c is not None:
                creat_values.append(c)
            e = raw.get("egfr")
            if e is not None and len(egfr_values) < MAX_TREND:
                egfr_values.append(e)

        # Urea from any input mode
        if len(urea_values) < MAX_TREND:
            u = raw.get("urea")
            if u is not None:
                urea_values.append(u)

        # Risk levels from predictions
        if len(risk_levels) < MAX_TREND:
            pred = r.prediction
            if pred and pred.output:
                risk_levels.append(pred.output.get("risk_level", "low"))

    # ── Generate insights from extracted values ──────────────────────────

    if len(creat_values) >= 2:
        trend = _detect_trend(creat_values)
        if trend == "increasing":
            insights.append(InsightResponse(
                metric="Creatinine", trend="increasing",
                message=f"Your creatinine has increased over the last {len(creat_values)} entries ({creat_values[-1]} → {creat_values[0]} mg/dL). Consider consulting your doctor.",
                severity="warning",
            ))
        elif trend == "decreasing":
            insights.append(InsightResponse(
                metric="Creatinine", trend="decreasing",
                message=f"Your creatinine is trending downward ({creat_values[-1]} → {creat_values[0]} mg/dL). This is a positive sign.",
                severity="positive",
            ))
        else:
            insights.append(InsightResponse(
                metric="Creatinine", trend="stable",
                message=f"Your creatinine values are stable around {creat_values[0]} mg/dL.",
                severity="info",
            ))

    if len(egfr_values) >= 2:
        trend = _detect_trend(egfr_values)
        if trend == "decreasing":
            insights.append(InsightResponse(
                metric="eGFR", trend="decreasing",
                message=f"Your eGFR is declining ({egfr_values[-1]} → {egfr_values[0]} mL/min). This may indicate worsening kidney function.",
                severity="warning",
            ))
        elif trend == "increasing":
            insights.append(InsightResponse(
                metric="eGFR", trend="increasing",
                message=f"Your eGFR is improving ({egfr_values[-1]} → {egfr_values[0]} mL/min). Kidney function appears to be recovering.",
                severity="positive",
            ))

    if len(urea_values) >= 2:
        trend = _detect_trend(urea_values)
        if trend == "increasing":
            insights.append(InsightResponse(
                metric="Urea", trend="increasing",
                message=f"Urea levels are rising over your last {len(urea_values)} readings. Monitor closely.",
                severity="warning",
            ))
        elif trend == "decreasing":
            insights.append(InsightResponse(
                metric="Urea", trend="decreasing",
                message="Urea levels are decreasing — your values are stabilizing.",
                severity="positive",
            ))

    if len(risk_levels) >= 2:
        risk_scores = {"low": 1, "moderate": 2, "high": 3, "critical": 4}
        risk_nums = [risk_scores.get(r, 2) for r in risk_levels]
        trend = _detect_trend(risk_nums)
        if trend == "increasing":
            insights.append(InsightResponse(
                metric="Overall Risk", trend="increasing",
                message="Your CKD risk level has been increasing across recent assessments.",
                severity="warning",
            ))
        elif trend == "decreasing":
            insights.append(InsightResponse(
                metric="Overall Risk", trend="decreasing",
                message="Your CKD risk is trending downward. Keep up the good work!",
                severity="positive",
            ))

    if not insights:
        insights.append(InsightResponse(
            metric="General", trend="stable",
            message="Not enough data to generate trends yet. Run more predictions to see insights.",
            severity="info",
        ))

    return insights


def _detect_trend(values: list[float]) -> str:
    """Simple trend detection: newest is first in the list."""
    if len(values) < 2:
        return "stable"

    newest = values[0]
    oldest = values[-1]
    change_pct = abs(newest - oldest) / max(abs(oldest), 0.01) * 100

    if change_pct < 5:
        return "stable"
    elif newest > oldest:
        return "increasing"
    else:
        return "decreasing"


async def trigger_alert_if_high_risk(db: Session, user_id: str, risk_level: str, explanation: str):
    """Trigger alert email if risk level is High or Critical.
    
    This is called asynchronously from the API endpoint after a record is saved.
    """
    if risk_level.lower() not in ("high", "critical"):
        return
    
    try:
        from app.services.alert import send_critical_alert
        result = await send_critical_alert(db, user_id, risk_level, explanation)
        logging.info("Alert triggered for user %s: %s", user_id, result)
    except Exception as e:
        logging.warning("Failed to trigger alert: %s", e)
