"""Database service functions for medication management."""

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.medication import Medication, MedicationPreference
from app.models.user import User
from app.schemas.medications import MedicationCreate, MedicationPreferenceUpdate, MedicationUpdate


def _iso(value: datetime | None) -> str:
    return value.isoformat() if value else ""


def _parse_iso_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    normalized = value.replace("Z", "+00:00")
    return datetime.fromisoformat(normalized)


def _serialize_medication(medication: Medication) -> dict:
    return {
        "id": medication.id,
        "user_id": medication.user_id,
        "name": medication.name,
        "prescribing_doctor": medication.prescribing_doctor,
        "start_date": medication.start_date,
        "end_date": medication.end_date,
        "dose_amount": medication.dose_amount,
        "unit": medication.unit,
        "route": medication.route,
        "frequency": medication.frequency,
        "custom_times": medication.custom_times or [],
        "schedule_times": medication.schedule_times or [],
        "meal_links": medication.meal_links or {},
        "quantity_on_hand": medication.quantity_on_hand,
        "refill_alert_threshold_days": medication.refill_alert_threshold_days,
        "pill_photo_name": medication.pill_photo_name or "",
        "is_phosphate_binder": medication.is_phosphate_binder,
        "interaction": {
            "severe": medication.interaction_severe or [],
            "moderate": medication.interaction_moderate or [],
            "none": medication.interaction_none or [],
            "checked_at": _iso(medication.interaction_checked_at),
        },
        "override_log_at": _iso(medication.override_log_at) if medication.override_log_at else None,
        "created_at": _iso(medication.created_at),
        "updated_at": _iso(medication.updated_at),
    }


def _serialize_preferences(preference: MedicationPreference) -> dict:
    return {
        "user_id": preference.user_id,
        "breakfast": preference.breakfast_time,
        "lunch": preference.lunch_time,
        "dinner": preference.dinner_time,
        "updated_at": _iso(preference.updated_at),
    }


def _ensure_user(db: Session, user_id: str) -> None:
    """Validate user exists without loading the full row — O(1) index lookup."""
    exists = db.query(User.id).filter(User.id == user_id).first()
    if not exists:
        raise ValueError("User not found.")


def list_medications(db: Session, user_id: str) -> list[dict]:
    _ensure_user(db, user_id)

    medications = db.query(Medication).filter(
        Medication.user_id == user_id,
    ).order_by(Medication.created_at.desc()).all()

    return [_serialize_medication(medication) for medication in medications]


def create_medication(db: Session, user_id: str, payload: MedicationCreate) -> dict:
    _ensure_user(db, user_id)

    now = datetime.now(timezone.utc)
    medication = Medication(
        user_id=user_id,
        name=payload.name.strip(),
        prescribing_doctor=payload.prescribing_doctor.strip(),
        start_date=payload.start_date,
        end_date=payload.end_date,
        dose_amount=payload.dose_amount,
        unit=payload.unit,
        route=payload.route,
        frequency=payload.frequency,
        custom_times=payload.custom_times,
        schedule_times=payload.schedule_times,
        meal_links=payload.meal_links,
        quantity_on_hand=payload.quantity_on_hand,
        refill_alert_threshold_days=payload.refill_alert_threshold_days,
        pill_photo_name=payload.pill_photo_name,
        is_phosphate_binder=payload.is_phosphate_binder,
        interaction_severe=payload.interaction.severe,
        interaction_moderate=payload.interaction.moderate,
        interaction_none=payload.interaction.none,
        interaction_checked_at=_parse_iso_datetime(payload.interaction.checked_at) or now,
        override_log_at=_parse_iso_datetime(payload.override_log_at),
        created_at=now,
        updated_at=now,
    )

    db.add(medication)
    db.commit()
    db.refresh(medication)
    return _serialize_medication(medication)


def delete_medication(db: Session, medication_id: str, user_id: str) -> dict:
    medication = db.query(Medication).filter(
        Medication.id == medication_id,
        Medication.user_id == user_id,
    ).first()

    if not medication:
        raise ValueError("Medication not found.")

    db.delete(medication)
    db.commit()

    return {
        "success": True,
        "message": "Medication deleted successfully.",
        "medication_id": medication_id,
    }


def update_medication(db: Session, medication_id: str, user_id: str, payload: MedicationUpdate) -> dict:
    medication = db.query(Medication).filter(
        Medication.id == medication_id,
        Medication.user_id == user_id,
    ).first()

    if not medication:
        raise ValueError("Medication not found.")

    medication.name = payload.name.strip()
    medication.prescribing_doctor = payload.prescribing_doctor.strip()
    medication.start_date = payload.start_date
    medication.end_date = payload.end_date
    medication.dose_amount = payload.dose_amount
    medication.unit = payload.unit
    medication.route = payload.route
    medication.frequency = payload.frequency
    medication.custom_times = payload.custom_times
    medication.schedule_times = payload.schedule_times
    medication.meal_links = payload.meal_links
    medication.quantity_on_hand = payload.quantity_on_hand
    medication.refill_alert_threshold_days = payload.refill_alert_threshold_days
    medication.pill_photo_name = payload.pill_photo_name
    medication.is_phosphate_binder = payload.is_phosphate_binder
    medication.interaction_severe = payload.interaction.severe
    medication.interaction_moderate = payload.interaction.moderate
    medication.interaction_none = payload.interaction.none
    medication.interaction_checked_at = _parse_iso_datetime(payload.interaction.checked_at) or datetime.now(timezone.utc)
    medication.override_log_at = _parse_iso_datetime(payload.override_log_at)
    medication.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(medication)
    return _serialize_medication(medication)


def get_or_create_preferences(db: Session, user_id: str) -> MedicationPreference:
    _ensure_user(db, user_id)

    preference = db.query(MedicationPreference).filter(
        MedicationPreference.user_id == user_id,
    ).first()

    if preference:
        return preference

    preference = MedicationPreference(
        user_id=user_id,
        breakfast_time="08:00",
        lunch_time="13:00",
        dinner_time="19:00",
        updated_at=datetime.now(timezone.utc),
    )
    db.add(preference)
    db.commit()
    db.refresh(preference)
    return preference


def get_preferences(db: Session, user_id: str) -> dict:
    preference = get_or_create_preferences(db, user_id)
    return _serialize_preferences(preference)


def update_preferences(db: Session, user_id: str, payload: MedicationPreferenceUpdate) -> dict:
    preference = get_or_create_preferences(db, user_id)

    preference.breakfast_time = payload.breakfast
    preference.lunch_time = payload.lunch
    preference.dinner_time = payload.dinner
    preference.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(preference)
    return _serialize_preferences(preference)
