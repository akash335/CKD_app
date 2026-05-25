from typing import List
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.alert import (
    AlertContactCreate,
    AlertContactResponse,
    AlertSettingsUpdate,
    AlertSettingsResponse,
    AlertTriggerRequest,
    AlertSendResponse,
)
from app.services.alert import (
    add_alert_contact,
    get_alert_contacts,
    delete_alert_contact,
    get_alert_settings,
    update_alert_settings,
    send_critical_alert,
)

router = APIRouter(prefix="/api/profile", tags=["Alerts"])

@router.post("/alert-contacts", response_model=AlertContactResponse)
def create_alert_contact(
    contact: AlertContactCreate,
    user_id: str = Query(..., description="User ID"),
    db: Session = Depends(get_db),
):
    return add_alert_contact(db=db, user_id=user_id, contact_in=contact)

@router.get("/alert-contacts", response_model=List[AlertContactResponse])
def read_my_alert_contacts(
    user_id: str = Query(..., description="User ID"),
    db: Session = Depends(get_db),
):
    return get_alert_contacts(db=db, user_id=user_id)

@router.get("/alert-contacts/view/{target_id}", response_model=List[AlertContactResponse])
def read_user_alert_contacts(
    target_id: str = Path(...),
    db: Session = Depends(get_db),
):
    return get_alert_contacts(db=db, user_id=target_id)

@router.delete("/alert-contacts/{contact_id}")
def remove_alert_contact(
    contact_id: str = Path(...),
    user_id: str = Query(..., description="User ID"),
    db: Session = Depends(get_db),
):
    return delete_alert_contact(db=db, user_id=user_id, contact_id=contact_id)

@router.get("/alert-settings", response_model=AlertSettingsResponse)
def read_my_alert_settings(
    user_id: str = Query(..., description="User ID"),
    db: Session = Depends(get_db),
):
    return get_alert_settings(db=db, user_id=user_id)

@router.get("/alert-settings/view/{target_id}", response_model=AlertSettingsResponse)
def read_user_alert_settings(
    target_id: str = Path(...),
    db: Session = Depends(get_db),
):
    return get_alert_settings(db=db, user_id=target_id)

@router.put("/alert-settings", response_model=AlertSettingsResponse)
def update_settings(
    settings_update: AlertSettingsUpdate,
    user_id: str = Query(..., description="User ID"),
    db: Session = Depends(get_db),
):
    return update_alert_settings(db=db, user_id=user_id, settings_update=settings_update)

@router.post("/alerts/send", response_model=AlertSendResponse)
async def trigger_alert_notification(
    alert_request: AlertTriggerRequest,
    user_id: str = Query(..., description="User ID"),
    db: Session = Depends(get_db),
):
    """
    Manually trigger alert notification to configured contacts.
    
    Used to send alerts based on health predictions or manual triggers.
    """
    result = await send_critical_alert(
        db=db,
        user_id=user_id,
        risk_level=alert_request.risk_level,
        explanation=alert_request.explanation,
    )
    return AlertSendResponse(**result)
