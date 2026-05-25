"""
SQLAlchemy ORM models package.

Import all models here so Alembic's env.py can discover them
through a single `from app.models import *` or via Base.metadata.
"""

from app.models.user import User
from app.models.health_record import HealthRecord
from app.models.prediction import Prediction
from app.models.ml_model import MLModel
from app.models.doctor_request import DoctorRequest
from app.models.doctor_patient import DoctorPatient
from app.models.password_reset import PasswordReset
from app.models.chat import Conversation, Message
from app.models.medication import Medication, MedicationPreference
from app.models.device_token import DeviceToken
from app.models.notification_preferences import NotificationPreferences
from app.models.alert import AlertContact, AlertSettings, AlertLog
from app.models.notification import Notification

__all__ = [
    "User",
    "HealthRecord",
    "Prediction",
    "MLModel",
    "DoctorRequest",
    "DoctorPatient",
    "PasswordReset",
    "Conversation",
    "Message",
    "Medication",
    "MedicationPreference",
    "DeviceToken",
    "NotificationPreferences",
    "AlertContact",
    "AlertSettings",
    "AlertLog",
    "Notification",
]
