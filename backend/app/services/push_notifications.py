"""
Push notification service — sends FCM push notifications via Firebase Admin SDK.

Handles:
- Registering / upserting device tokens
- Sending to a single user (all their devices)
- Sending new-message push notifications
- Graceful fallback if Firebase is not configured
"""

import logging
import os
from typing import Optional

from sqlalchemy.orm import Session

from app.models.device_token import DeviceToken

logger = logging.getLogger(__name__)

# ── Firebase Admin SDK (optional — graceful fallback if not configured) ────

_firebase_app = None


def _get_firebase_app():
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    try:
        import firebase_admin
        from firebase_admin import credentials

        cred_path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_KEY")
        if not cred_path or not os.path.exists(cred_path):
            logger.warning(
                "FIREBASE_SERVICE_ACCOUNT_KEY not set or file not found. "
                "Push notifications will be skipped."
            )
            return None

        if not firebase_admin._apps:
            cred = credentials.Certificate(cred_path)
            _firebase_app = firebase_admin.initialize_app(cred)
        else:
            _firebase_app = firebase_admin.get_app()

        logger.info("✅ Firebase Admin SDK initialized")
        return _firebase_app

    except ImportError:
        logger.warning("firebase-admin not installed. Push notifications disabled.")
        return None
    except Exception as exc:
        logger.error(f"Failed to initialize Firebase: {exc}")
        return None


# ── Device Token CRUD ────────────────────────────────────────────────────────

def register_device_token(db: Session, user_id: str, token: str, platform: str = "android") -> DeviceToken:
    """Upsert a device token for a user."""
    existing = db.query(DeviceToken).filter(
        DeviceToken.user_id == user_id,
        DeviceToken.token == token,
    ).first()

    if existing:
        existing.platform = platform
        db.commit()
        db.refresh(existing)
        return existing

    device_token = DeviceToken(
        user_id=user_id,
        token=token,
        platform=platform,
    )
    db.add(device_token)
    db.commit()
    db.refresh(device_token)
    return device_token


def remove_device_token(db: Session, user_id: str, token: str) -> bool:
    """Remove a specific device token (logout / token refresh)."""
    deleted = db.query(DeviceToken).filter(
        DeviceToken.user_id == user_id,
        DeviceToken.token == token,
    ).delete(synchronize_session=False)
    db.commit()
    return deleted > 0


def get_user_tokens(db: Session, user_id: str) -> list[str]:
    """Return all FCM tokens for a user."""
    rows = db.query(DeviceToken.token).filter(DeviceToken.user_id == user_id).all()
    return [r.token for r in rows]


# ── Push Sending ─────────────────────────────────────────────────────────────

def send_push_to_user(
    db: Session,
    user_id: str,
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> dict:
    """
    Send a push notification to all registered devices for a user.
    Returns a result dict with success/failure counts.
    """
    app = _get_firebase_app()
    if app is None:
        return {"skipped": True, "reason": "Firebase not configured"}

    tokens = get_user_tokens(db, user_id)
    if not tokens:
        return {"skipped": True, "reason": "No device tokens registered"}

    try:
        from firebase_admin import messaging

        messages = [
            messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                data={k: str(v) for k, v in (data or {}).items()},
                android=messaging.AndroidConfig(
                    priority="high",
                    notification=messaging.AndroidNotification(
                        icon="ic_notification",
                        color="#4F46E5",
                        sound="default",
                        channel_id="ckdguardian_messages",
                    ),
                ),
                token=token,
            )
            for token in tokens
        ]

        batch_response = messaging.send_each(messages)
        success = batch_response.success_count
        failure = batch_response.failure_count

        # Clean up invalid tokens
        invalid_tokens = []
        for idx, resp in enumerate(batch_response.responses):
            if not resp.success and resp.exception:
                err_code = getattr(resp.exception, "code", "")
                if err_code in (
                    "registration-token-not-registered",
                    "invalid-registration-token",
                ):
                    invalid_tokens.append(tokens[idx])

        if invalid_tokens:
            db.query(DeviceToken).filter(
                DeviceToken.user_id == user_id,
                DeviceToken.token.in_(invalid_tokens),
            ).delete(synchronize_session=False)
            db.commit()
            logger.info(f"Cleaned up {len(invalid_tokens)} stale tokens for user {user_id}")

        logger.info(f"Push sent to {user_id}: {success} success, {failure} failure")
        return {"success": success, "failure": failure}

    except Exception as exc:
        logger.error(f"Push notification failed for {user_id}: {exc}")
        return {"error": str(exc)}


def send_new_message_notification(
    db: Session,
    receiver_id: str,
    sender_name: str,
    message_preview: str,
    conversation_id: str,
) -> dict:
    """
    Send a new-message push notification to the receiver.
    Respects user notification preferences (chat_messages toggle).
    """
    # Check preferences
    try:
        from app.models.notification_preferences import NotificationPreferences
        prefs = db.query(NotificationPreferences).filter(
            NotificationPreferences.user_id == receiver_id
        ).first()
        if prefs and (not prefs.push_enabled or not prefs.chat_messages):
            return {"skipped": True, "reason": "Chat notifications disabled by user"}
    except Exception:
        pass  # If prefs don't exist yet, proceed

    preview = message_preview[:80] + "…" if len(message_preview) > 80 else message_preview
    return send_push_to_user(
        db=db,
        user_id=receiver_id,
        title=f"💬 {sender_name}",
        body=preview,
        data={
            "type": "new_message",
            "conversation_id": conversation_id,
            "sender_name": sender_name,
        },
    )


def send_health_alert_notification(
    db: Session,
    user_id: str,
    risk_level: str,
    explanation: str,
) -> dict:
    """
    Send a health alert push notification to the user's own devices.
    Respects user notification preferences (health_alerts toggle).
    """
    try:
        from app.models.notification_preferences import NotificationPreferences
        prefs = db.query(NotificationPreferences).filter(
            NotificationPreferences.user_id == user_id
        ).first()
        if prefs and (not prefs.push_enabled or not prefs.health_alerts):
            return {"skipped": True, "reason": "Health alert notifications disabled by user"}
    except Exception:
        pass

    risk_emoji = {"low": "✅", "moderate": "⚠️", "high": "🔴", "critical": "🚨"}.get(
        risk_level.lower(), "⚠️"
    )
    preview = explanation[:100] + "…" if len(explanation) > 100 else explanation

    return send_push_to_user(
        db=db,
        user_id=user_id,
        title=f"{risk_emoji} {risk_level.upper()} Risk Alert — CKD Guardian",
        body=preview,
        data={
            "type": "health_alert",
            "risk_level": risk_level,
        },
    )

