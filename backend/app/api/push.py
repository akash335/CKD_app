"""Push notification API routes — register/remove device tokens, send notifications."""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.services.push_notifications import (
    register_device_token,
    remove_device_token,
    send_push_to_user,
)

router = APIRouter(prefix="/api/push", tags=["Push Notifications"])


class RegisterTokenRequest(BaseModel):
    user_id: str
    token: str
    platform: str = Field(default="android", pattern="^(android|ios|web)$")


class RemoveTokenRequest(BaseModel):
    user_id: str
    token: str


class SendPushRequest(BaseModel):
    user_id: str
    title: str
    body: str
    data: dict = {}


@router.post("/register")
async def register_token(payload: RegisterTokenRequest, db: Session = Depends(get_db)):
    """Register or refresh a device's FCM push token."""
    try:
        device_token = register_device_token(
            db,
            user_id=payload.user_id,
            token=payload.token,
            platform=payload.platform,
        )
        return {
            "success": True,
            "message": "Device token registered successfully.",
            "token_id": device_token.id,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.delete("/register")
async def remove_token(payload: RemoveTokenRequest, db: Session = Depends(get_db)):
    """Remove a device token on logout or token refresh."""
    removed = remove_device_token(db, user_id=payload.user_id, token=payload.token)
    return {"success": removed, "message": "Token removed." if removed else "Token not found."}


@router.post("/send")
async def send_notification(payload: SendPushRequest, db: Session = Depends(get_db)):
    """Manually trigger a push notification to a user (admin / testing)."""
    result = send_push_to_user(
        db=db,
        user_id=payload.user_id,
        title=payload.title,
        body=payload.body,
        data=payload.data,
    )
    return result
