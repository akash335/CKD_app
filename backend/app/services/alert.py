import logging
import uuid
import httpx
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.alert import AlertContact, AlertSettings, AlertLog
from app.models.user import User
from app.schemas.alert import AlertContactCreate, AlertSettingsUpdate
from app.core.config import get_settings

settings = get_settings()


def get_alert_settings(db: Session, user_id: str) -> AlertSettings:
    db_settings = db.query(AlertSettings).filter(AlertSettings.user_id == user_id).first()
    if not db_settings:
        db_settings = AlertSettings(id=str(uuid.uuid4()), user_id=user_id)
        db.add(db_settings)
        db.commit()
        db.refresh(db_settings)
    return db_settings

def update_alert_settings(db: Session, user_id: str, settings_update: AlertSettingsUpdate) -> AlertSettings:
    db_settings = get_alert_settings(db, user_id)
    update_data = settings_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_settings, key, value)
    db.commit()
    db.refresh(db_settings)
    return db_settings

def get_alert_contacts(db: Session, user_id: str):
    return db.query(AlertContact).filter(AlertContact.user_id == user_id).all()

def add_alert_contact(db: Session, user_id: str, contact_in: AlertContactCreate) -> AlertContact:
    contacts = get_alert_contacts(db, user_id)
    if len(contacts) >= 2:
        raise HTTPException(status_code=400, detail="Maximum 2 alert contacts allowed.")
    
    # Check for duplicate email
    for c in contacts:
        if c.email.lower() == contact_in.email.lower():
            raise HTTPException(status_code=400, detail="Contact with this email already exists.")
            
    db_contact = AlertContact(
        id=str(uuid.uuid4()),
        user_id=user_id,
        name=contact_in.name,
        email=contact_in.email,
        relation=contact_in.relation
    )
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)
    return db_contact

def delete_alert_contact(db: Session, user_id: str, contact_id: str):
    db_contact = db.query(AlertContact).filter(AlertContact.id == contact_id, AlertContact.user_id == user_id).first()
    if not db_contact:
        raise HTTPException(status_code=404, detail="Contact not found.")
    db.delete(db_contact)
    db.commit()
    return {"message": "Contact deleted successfully."}

async def send_critical_alert(db: Session, user_id: str, risk_level: str, explanation: str):
    """Send alert email to emergency contacts for High or Critical risk levels."""
    risk_lower = risk_level.lower()
    if risk_lower not in ("high", "critical"):
        return {"status": "skipped", "reason": f"Risk level '{risk_level}' does not trigger alerts"}
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {"status": "skipped", "reason": "User not found"}
        
    alert_settings = get_alert_settings(db, user_id)
    if not alert_settings.enable_email_alerts:
        return {"status": "skipped", "reason": "Alerts disabled by user"}
        
    # 1-hour cooldown between alert emails
    if alert_settings.last_alert_sent_at:
        cooldown_end = alert_settings.last_alert_sent_at + timedelta(hours=1)
        if datetime.utcnow() < cooldown_end:
            return {"status": "skipped", "reason": "Alert cooldown active (1 hour)"}
            
    contacts = db.query(AlertContact).filter(AlertContact.user_id == user_id, AlertContact.is_active == True).limit(2).all()
    if not contacts:
        return {"status": "skipped", "reason": "No active contacts found"}
        
    # Send email using Brevo
    brevo_api_key = settings.BREVO_API_KEY
    if not brevo_api_key:
        logging.warning("BREVO_API_KEY not configured. Alert email skipped.")
        return {"status": "skipped", "reason": "Brevo API key not configured"}
        
    recipients = [{"email": c.email, "name": c.name} for c in contacts]
    
    # Customize email based on risk level
    is_critical = risk_level.lower() == "critical"
    severity_color = "#d32f2f" if is_critical else "#f57c00"  # Red for critical, Orange for high
    subject_prefix = "🚨 CRITICAL" if is_critical else "⚠️  HIGH RISK"
    
    # Build emergency care line for critical cases
    emergency_line = "<li><strong>Seek emergency care if you experience severe symptoms like difficulty breathing, chest pain, or confusion</strong></li>" if is_critical else ""
    
    payload = {
        "sender": {"name": settings.BREVO_SENDER_NAME, "email": settings.BREVO_SENDER_EMAIL},
        "to": recipients,
        "subject": f"{subject_prefix} Health Alert - CKD Guardian",
        "htmlContent": f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid {severity_color}; border-radius: 8px; background-color: #fafafa;">
                    <h1 style="color: {severity_color}; text-align: center;">{subject_prefix} Health Alert</h1>
                    <p>Dear {user.name or 'User'},</p>
                    <p>You have received an urgent health notification regarding kidney function monitoring:</p>
                    
                    <div style="background-color: #fff; padding: 15px; border-left: 4px solid {severity_color}; margin: 20px 0; border-radius: 4px;">
                        <p><strong>Risk Level:</strong> <span style="color: {severity_color}; font-weight: bold; font-size: 1.2em;">{risk_level.upper()}</span></p>
                        <p><strong>Date:</strong> {datetime.utcnow().strftime('%B %d, %Y at %I:%M %p UTC')}</p>
                        <p><strong>Details:</strong></p>
                        <p style="margin: 10px 0; padding: 10px; background-color: #f5f5f5; border-radius: 4px;">{explanation}</p>
                    </div>
                    
                    <p style="margin-top: 20px;"><strong>What you should do:</strong></p>
                    <ul style="line-height: 1.8;">
                        <li>Log in to your CKD Guardian dashboard immediately to review your detailed assessment</li>
                        <li>Contact your nephrologist or healthcare provider as soon as possible</li>
                        {emergency_line}
                        <li>Share this alert with your healthcare team</li>
                    </ul>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <a href="https://ckdguardian.com/dashboard" style="background-color: {severity_color}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Go to Dashboard</a>
                    </div>
                    
                    <hr style="margin-top: 30px; border: none; border-top: 2px solid {severity_color};">
                    <p style="font-size: 12px; color: #999; text-align: center;">CKD Guardian - CKD Monitoring & Prediction System</p>
                    <p style="font-size: 11px; color: #999; text-align: center;">This is an automated alert. Please do not reply to this email.</p>
                </div>
            </body>
        </html>
        """
    }
    
    headers = {
        "api-key": brevo_api_key,
        "accept": "application/json",
        "content-type": "application/json"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.brevo.com/v3/smtp/email",
                json=payload,
                headers=headers,
                timeout=10.0
            )
            response.raise_for_status()
            logging.info("Alert email sent successfully to %d recipient(s)", len(recipients))
    except httpx.HTTPStatusError as e:
        error_details = e.response.text
        logging.error("Brevo API error: %d — %s", e.response.status_code, error_details)
        
        return {"status": "error", "reason": f"Email sending failed: {e.response.status_code}"}
    except Exception as e:
        logging.error("Failed to send alert email via Brevo: %s — %s", type(e).__name__, e)
        return {"status": "error", "reason": "Email sending failed"}
        
    # Log alert
    alert_log = AlertLog(
        id=str(uuid.uuid4()),
        user_id=user_id,
        risk_level=risk_level,
        recipients=recipients
    )
    db.add(alert_log)

    # Update settings
    alert_settings.last_alert_sent_at = datetime.utcnow()

    db.commit()

    return {"status": "success", "recipients": len(recipients)}

