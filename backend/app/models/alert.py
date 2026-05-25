from datetime import datetime
from typing import Optional
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, JSON, Integer
from sqlalchemy.orm import relationship

from app.database.base import Base

class AlertContact(Base):
    __tablename__ = "alert_contacts"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    relation = Column(String, nullable=False)  # doctor / parent / caregiver
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="alert_contacts")

class AlertSettings(Base):
    __tablename__ = "alert_settings"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    enable_email_alerts = Column(Boolean, default=True)
    max_alerts_per_day = Column(Integer, default=3)
    cooldown_hours = Column(Integer, default=6)
    last_alert_sent_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="alert_settings")

class AlertLog(Base):
    __tablename__ = "alert_logs"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    risk_level = Column(String, nullable=False)
    recipients = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
