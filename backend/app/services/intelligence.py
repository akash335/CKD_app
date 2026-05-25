"""
Intelligence service — rule-based engine for recommendations, alerts, and condition summaries.

Database-backed: receives a db session and queries records from PostgreSQL.
Structured for easy future integration with external AI APIs.
"""

import uuid
from typing import Optional

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc

from app.schemas.intelligence import Recommendation, Alert, IntelligenceReport
from app.models.health_record import HealthRecord
from app.services.records import _detect_trend


def generate_intelligence_report(db: Session, user_id: Optional[str] = None) -> IntelligenceReport:
    """Build a full intelligence report from current record history.
    
    Optimized: queries HealthRecords directly with joinedload instead of
    going through the full RecordResponse conversion (which was O(N) extra
    object allocations + dict conversions).
    """
    query = (
        db.query(HealthRecord)
        .options(joinedload(HealthRecord.prediction))
        .order_by(desc(HealthRecord.created_at))
    )
    if user_id:
        query = query.filter(HealthRecord.user_id == user_id)
    orm_records = query.all()

    # Build lightweight dicts with only the fields the analysis functions need
    records = []
    for r in orm_records:
        output = r.prediction.output if r.prediction else {}
        records.append({
            "id": r.id,
            "input_mode": r.input_type,
            "input_values": r.raw_input or {},
            "risk_level": output.get("risk_level", "low"),
            "confidence": output.get("confidence", 0),
            "health_score": output.get("health_score", 100),
            "explanation": output.get("explanation", ""),
            "contributing_factors": output.get("contributing_factors", []),
            "created_at": r.created_at.isoformat() if r.created_at else "",
        })

    alerts = _generate_alerts(records)
    recommendations = _generate_recommendations(records)
    summary, trend_label = _generate_summary(records)
    risk_level = records[0]["risk_level"] if records else "unknown"

    return IntelligenceReport(
        alerts=alerts,
        recommendations=recommendations,
        condition_summary=summary,
        trend_label=trend_label,
        risk_level=risk_level,
        data_points=len(records),
    )


# ── Alert Generation ────────────────────────────────────────────────────────

def _generate_alerts(records: list[dict]) -> list[Alert]:
    alerts: list[Alert] = []

    if not records:
        return alerts

    latest = records[0]

    # Critical risk alert
    if latest["risk_level"] == "critical":
        alerts.append(Alert(
            id=_uid(), severity="critical",
            title="Critical CKD Risk Detected",
            message="Your most recent assessment indicates critical kidney disease risk. Please consult your nephrologist immediately.",
            metric="risk_level",
            action="Schedule an appointment with your doctor within 24 hours",
        ))

    # High risk alert
    elif latest["risk_level"] == "high":
        alerts.append(Alert(
            id=_uid(), severity="warning",
            title="High CKD Risk",
            message="Your assessment shows elevated risk. Medical attention is recommended.",
            metric="risk_level",
            action="Contact your healthcare provider this week",
        ))

    # Rapid creatinine increase
    hospital_records = [r for r in records if r["input_mode"] == "hospital"]
    if len(hospital_records) >= 2:
        creat_vals = [r["input_values"].get("creatinine") for r in hospital_records[:4] if r["input_values"].get("creatinine")]
        if len(creat_vals) >= 2 and creat_vals[0] > creat_vals[-1] * 1.2:
            alerts.append(Alert(
                id=_uid(), severity="warning",
                title="Rapid Creatinine Increase",
                message=f"Creatinine rose from {creat_vals[-1]} to {creat_vals[0]} mg/dL — a {((creat_vals[0] - creat_vals[-1]) / creat_vals[-1] * 100):.0f}% increase.",
                metric="creatinine",
                action="Get a follow-up blood test to confirm values",
            ))

        # eGFR decline
        egfr_vals = [r["input_values"].get("egfr") for r in hospital_records[:4] if r["input_values"].get("egfr")]
        if len(egfr_vals) >= 2 and egfr_vals[0] < egfr_vals[-1] * 0.85:
            alerts.append(Alert(
                id=_uid(), severity="warning",
                title="Significant eGFR Decline",
                message=f"eGFR dropped from {egfr_vals[-1]} to {egfr_vals[0]} mL/min, suggesting reduced kidney filtering capacity.",
                metric="egfr",
                action="Discuss kidney function trends with your doctor",
            ))

    # Low health score alert
    if latest["health_score"] < 35:
        alerts.append(Alert(
            id=_uid(), severity="critical",
            title="Very Low Health Score",
            message=f"Your health score is {latest['health_score']}/100. Multiple risk factors are contributing.",
            metric="health_score",
            action="Review all contributing factors and seek medical guidance",
        ))

    # Worsening trend alert
    if len(records) >= 3:
        scores = [r["health_score"] for r in records[:5]]
        trend = _detect_trend(scores)
        if trend == "decreasing":
            alerts.append(Alert(
                id=_uid(), severity="warning",
                title="Health Score Declining",
                message="Your health score has been decreasing across recent assessments. This trend needs attention.",
                metric="health_score",
                action="Review your recent lifestyle and medication adherence",
            ))

    return alerts


# ── Recommendation Generation ───────────────────────────────────────────────

def _generate_recommendations(records: list[dict]) -> list[Recommendation]:
    recs: list[Recommendation] = []

    if not records:
        recs.append(Recommendation(
            id=_uid(), category="monitoring", priority="medium",
            title="Start Tracking Your Health",
            description="Submit your first lab values to receive personalized CKD management recommendations.",
            icon="📊",
        ))
        return recs

    latest = records[0]
    risk = latest["risk_level"]
    vals = latest["input_values"]

    # ── Diet recommendations ──

    if vals.get("creatinine", 0) > 1.5 or vals.get("urea", 0) > 30:
        recs.append(Recommendation(
            id=_uid(), category="diet", priority="high",
            title="Reduce Protein Intake",
            description="Elevated creatinine/urea suggests your kidneys are working hard to filter waste. Limit red meat, dairy, and processed protein. Aim for 0.6–0.8g protein per kg of body weight.",
            icon="🥗",
        ))

    if risk in ("high", "critical"):
        recs.append(Recommendation(
            id=_uid(), category="diet", priority="high",
            title="Limit Sodium & Potassium",
            description="High-risk CKD patients should reduce salt intake to <2g/day and avoid high-potassium foods like bananas, oranges, and potatoes to reduce kidney strain.",
            icon="🧂",
        ))

    if risk in ("low", "moderate"):
        recs.append(Recommendation(
            id=_uid(), category="diet", priority="low",
            title="Maintain a Kidney-Friendly Diet",
            description="Continue eating balanced meals with adequate fruits, vegetables, and whole grains. Moderate protein intake is recommended.",
            icon="🍎",
        ))

    # ── Hydration ──

    if vals.get("urea", 0) > 25:
        recs.append(Recommendation(
            id=_uid(), category="hydration", priority="high",
            title="Increase Water Intake",
            description="Elevated urea levels can indicate dehydration. Aim for 2–2.5 liters of water daily unless your doctor advises otherwise. Avoid sugary drinks.",
            icon="💧",
        ))
    else:
        recs.append(Recommendation(
            id=_uid(), category="hydration", priority="low",
            title="Stay Hydrated",
            description="Maintain adequate fluid intake of 1.5–2 liters daily. Good hydration supports kidney function.",
            icon="💧",
        ))

    # ── Monitoring frequency ──

    if risk == "critical":
        recs.append(Recommendation(
            id=_uid(), category="monitoring", priority="high",
            title="Weekly Lab Monitoring",
            description="At critical risk, monitor creatinine, eGFR, and urea weekly. Track any rapid changes and report to your doctor immediately.",
            icon="🔬",
        ))
    elif risk == "high":
        recs.append(Recommendation(
            id=_uid(), category="monitoring", priority="high",
            title="Bi-Weekly Check-ups",
            description="With high CKD risk, schedule lab tests every 2 weeks. Consistent tracking helps catch deterioration early.",
            icon="📅",
        ))
    elif risk == "moderate":
        recs.append(Recommendation(
            id=_uid(), category="monitoring", priority="medium",
            title="Monthly Monitoring",
            description="At moderate risk, monthly blood work is recommended. Use the Data Input tab to log values after each test.",
            icon="📅",
        ))
    else:
        recs.append(Recommendation(
            id=_uid(), category="monitoring", priority="low",
            title="Quarterly Check-ups",
            description="Your risk is currently low. Continue regular health screenings every 3 months to maintain early detection.",
            icon="✅",
        ))

    # ── Lifestyle ──

    recs.append(Recommendation(
        id=_uid(), category="lifestyle", priority="medium",
        title="Regular Light Exercise",
        description="30 minutes of walking or light activity daily can improve cardiovascular health and support kidney function. Avoid intense exercise if eGFR is below 30.",
        icon="🏃",
    ))

    if vals.get("hemoglobin", 99) < 11:
        recs.append(Recommendation(
            id=_uid(), category="medical", priority="high",
            title="Address Low Hemoglobin",
            description=f"Hemoglobin at {vals.get('hemoglobin')} g/dL may indicate CKD-related anemia. Discuss iron supplements or erythropoietin therapy with your doctor.",
            icon="🩸",
        ))

    if vals.get("egfr", 100) < 30:
        recs.append(Recommendation(
            id=_uid(), category="medical", priority="high",
            title="Nephrology Referral Advised",
            description="eGFR below 30 indicates severe kidney impairment (Stage 4). A nephrologist should be managing your care plan.",
            icon="🏥",
        ))

    return recs


# ── Condition Summary ────────────────────────────────────────────────────────

def _generate_summary(records: list[dict]) -> tuple[str, str]:
    if not records:
        return "No data available yet. Submit a prediction to get started.", "insufficient_data"

    if len(records) < 2:
        risk = records[0]["risk_level"]
        summaries = {
            "low": "Your initial assessment shows low CKD risk. Keep tracking to build a trend.",
            "moderate": "Your initial assessment indicates moderate risk. Regular monitoring is recommended.",
            "high": "Your initial assessment shows high CKD risk. Medical follow-up is advised.",
            "critical": "Your initial assessment detected critical risk. Seek medical attention promptly.",
        }
        return summaries.get(risk, "Assessment recorded."), "insufficient_data"

    # Analyze trend
    scores = [r["health_score"] for r in records[:5]]
    trend = _detect_trend(scores)
    latest_risk = records[0]["risk_level"]
    latest_score = records[0]["health_score"]

    if trend == "increasing":
        return f"Your health is improving — score rose to {latest_score}/100 over your last {len(scores)} assessments. Keep up your current regimen.", "improving"
    elif trend == "decreasing":
        return f"Your condition is worsening — score declined to {latest_score}/100. Review your diet, hydration, and medication with your doctor.", "worsening"
    else:
        return f"Your health metrics are stable at {latest_score}/100. Continue monitoring regularly to maintain this baseline.", "stable"


def _uid() -> str:
    return str(uuid.uuid4())[:8]
