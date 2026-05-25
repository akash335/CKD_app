"""Intelligence API — smart insights, recommendations, and alerts (database-backed)."""

from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.schemas.intelligence import IntelligenceReport
from app.services.intelligence import generate_intelligence_report

router = APIRouter(prefix="/api/intelligence", tags=["Intelligence"])


@router.get("/report", response_model=IntelligenceReport)
async def get_intelligence_report(
    user_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Generate a full intelligence report with alerts, recommendations, and condition summary."""
    return generate_intelligence_report(db, user_id=user_id)
