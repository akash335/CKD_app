"""
Medicine reminder scheduler — scans medications and fires push notifications
at the correct scheduled times.

Runs as a background asyncio task, checks every minute.
"""

import asyncio
import logging
from datetime import datetime, timezone

from app.database.session import SessionLocal
from app.models.medication import Medication, MedicationPreference
from app.models.notification_preferences import NotificationPreferences
from app.services.push_notifications import send_push_to_user

logger = logging.getLogger(__name__)

# Track already-fired reminders to avoid duplicate sends within the same minute
_fired: set[str] = set()


def _current_hhmm() -> str:
    return datetime.now(timezone.utc).strftime("%H:%M")


def _check_and_send_reminders() -> None:
    """Synchronous DB work — run in a thread via asyncio.to_thread."""
    db = SessionLocal()
    try:
        now_hhmm = _current_hhmm()
        # Build a cache key per (medication_id, time) to avoid duplicates
        fire_key_prefix = f"{datetime.now(timezone.utc).strftime('%Y-%m-%d')}:{now_hhmm}"

        # Load all active medications that have schedule_times
        medications = (
            db.query(Medication)
            .filter(Medication.schedule_times.isnot(None))
            .all()
        )

        for med in medications:
            schedule_times: list = med.schedule_times or []
            if not schedule_times:
                continue

            # Check if current time matches any scheduled time (HH:MM)
            for t in schedule_times:
                fire_key = f"{fire_key_prefix}:{med.id}:{t}"
                if t == now_hhmm and fire_key not in _fired:
                    _fired.add(fire_key)

                    # Check user notification preferences
                    prefs = (
                        db.query(NotificationPreferences)
                        .filter(NotificationPreferences.user_id == med.user_id)
                        .first()
                    )
                    if prefs and (not prefs.push_enabled or not prefs.medicine_reminders):
                        continue

                    dose_str = f"{med.dose_amount}{med.unit}" if med.dose_amount else ""
                    send_push_to_user(
                        db=db,
                        user_id=med.user_id,
                        title=f"💊 Time for {med.name}",
                        body=f"Take your {dose_str} dose of {med.name} now.",
                        data={
                            "type": "medicine_reminder",
                            "medication_id": med.id,
                            "medication_name": med.name,
                        },
                    )
                    logger.info(f"Medicine reminder sent: {med.name} → user {med.user_id}")

        # Clean up old fired keys (keep only today's)
        today_prefix = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        stale = {k for k in _fired if not k.startswith(today_prefix)}
        _fired.difference_update(stale)

    except Exception as exc:
        logger.error(f"Medicine reminder scheduler error: {exc}")
    finally:
        db.close()


async def run_medicine_reminder_scheduler() -> None:
    """Async background loop — checks reminders every 60 seconds."""
    logger.info("✅ Medicine reminder scheduler started")
    while True:
        try:
            await asyncio.to_thread(_check_and_send_reminders)
        except Exception as exc:
            logger.error(f"Scheduler loop error: {exc}")
        await asyncio.sleep(60)
