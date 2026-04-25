from sqlalchemy.orm import Session
from ..models.notification import Notification


def create_notification(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    type: str = "info",
    related_patient_id: int | None = None,
):
    item = Notification(
        user_id=user_id,
        title=title,
        message=message,
        type=type,
        related_patient_id=related_patient_id,
        is_read=False,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item