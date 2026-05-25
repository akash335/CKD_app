import asyncio
import logging
from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.services.alert import update_alert_settings, send_critical_alert, get_alert_contacts
from app.schemas.alert import AlertSettingsUpdate
from app.models.user import User

logging.basicConfig(level=logging.INFO)

async def main():
    db = SessionLocal()
    try:
        # Find the user
        user = db.query(User).filter(User.email == "chandoluajith@gmail.com").first()
        if not user:
            print("User not found")
            return
            
        print(f"Testing for user: {user.name} ({user.id})")
        
        # 1. Update settings to enable alerts
        print("Enabling alerts...")
        update_alert_settings(db, user.id, AlertSettingsUpdate(enable_email_alerts=True))
        
        # Check contacts
        contacts = get_alert_contacts(db, user.id)
        print(f"Contacts: {[c.email for c in contacts]}")
        
        # 2. Trigger alert
        print("Sending critical alert...")
        result = await send_critical_alert(
            db=db,
            user_id=user.id,
            risk_level="Critical",
            explanation="This is a test alert from the automated verification process."
        )
        print(f"Alert result: {result}")
        
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(main())
