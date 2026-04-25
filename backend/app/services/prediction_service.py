from __future__ import annotations
import os
import joblib
import numpy as np
from sqlalchemy.orm import Session

from ..config import settings
from ..models.reading import Reading
from ..models.prediction import Prediction
from ..models.alert import Alert
from ..models.user import User
from ..models.patient import Patient
from ..services.email_service import send_doctor_urgent_alert_email
from ..services.notification_service import create_notification

FEATURE_ORDER = [
    "creatinine_value",
    "urine_albumin",
    "acr",
    "egfr",
    "systolic_bp",
    "diastolic_bp",
    "glucose",
    "sensor_value_1",
    "sensor_value_2",
    "symptom_fatigue",
    "symptom_swelling",
    "symptom_low_urine",
    "adherence_score",
]


def _safe_value(value, default=0.0):
    return float(value) if value is not None else default


def _build_feature_vector(reading: Reading):
    return np.array([
        _safe_value(reading.creatinine_value),
        _safe_value(reading.urine_albumin),
        _safe_value(reading.acr),
        _safe_value(reading.egfr),
        _safe_value(reading.systolic_bp),
        _safe_value(reading.diastolic_bp),
        _safe_value(reading.glucose),
        _safe_value(reading.sensor_value_1),
        _safe_value(reading.sensor_value_2),
        1.0 if reading.symptom_fatigue else 0.0,
        1.0 if reading.symptom_swelling else 0.0,
        1.0 if reading.symptom_low_urine else 0.0,
        _safe_value(reading.adherence_score, 50.0),
    ]).reshape(1, -1)


def _heuristic_score(reading: Reading):
    score = 10.0
    explanation_bits = []

    if reading.creatinine_value and reading.creatinine_value > 1.3:
        score += 20
        explanation_bits.append("creatinine is elevated")
    if reading.acr and reading.acr > 30:
        score += 20
        explanation_bits.append("ACR is above normal")
    if reading.egfr and reading.egfr < 60:
        score += 20
        explanation_bits.append("eGFR is reduced")
    if reading.systolic_bp and reading.systolic_bp > 140:
        score += 10
        explanation_bits.append("systolic blood pressure is high")
    if reading.diastolic_bp and reading.diastolic_bp > 90:
        score += 5
        explanation_bits.append("diastolic blood pressure is high")
    if reading.symptom_swelling:
        score += 5
        explanation_bits.append("swelling is reported")
    if reading.symptom_fatigue:
        score += 5
        explanation_bits.append("fatigue is reported")
    if reading.sensor_value_1 and reading.sensor_value_1 > 1.5:
        score += 10
        explanation_bits.append("sensor value 1 is elevated")
    if reading.sensor_value_2 and reading.sensor_value_2 > 1.5:
        score += 10
        explanation_bits.append("sensor value 2 is elevated")

    score = max(0, min(100, score))
    confidence = min(0.95, 0.60 + score / 250)
    explanation = ", ".join(explanation_bits) if explanation_bits else "values are currently within safer ranges"
    return score, confidence, explanation


def _trend_status(db: Session, patient_id: int, current_score: float):
    latest_two = (
        db.query(Prediction)
        .filter(Prediction.patient_id == patient_id)
        .order_by(Prediction.created_at.desc())
        .limit(2)
        .all()
    )
    if not latest_two:
        return "Stable"

    previous = latest_two[0].risk_score
    if current_score > previous + 5:
        return "Worsening"
    if current_score < previous - 5:
        return "Improving"
    return "Stable"


def _risk_level(score: float):
    if score >= 75:
        return "High"
    if score >= 40:
        return "Moderate"
    return "Low"


def notify_doctors_for_urgent_case(db: Session, patient_id: int, risk_score: float, summary: str):
    doctors = db.query(User).filter(User.role == "doctor").all()
    print("URGENT CASE: doctors found =", len(doctors))

    for doctor in doctors:
        print("DOCTOR USER:", doctor.id, doctor.name, doctor.email)

        if doctor.email:
            print("SENDING URGENT EMAIL TO DOCTOR:", doctor.email)
            send_doctor_urgent_alert_email(
                doctor_email=doctor.email,
                doctor_name=doctor.name,
                patient_id=patient_id,
                risk_score=risk_score,
                summary=summary,
            )

        print("CREATING DOCTOR NOTIFICATION FOR USER:", doctor.id)
        create_notification(
            db=db,
            user_id=doctor.id,
            title="Urgent CKD case",
            message=f"Patient {patient_id} submitted a high-risk CKD reading. Please review immediately.",
            type="urgent",
            related_patient_id=patient_id,
        )


def notify_patient_for_urgent_case(db: Session, patient_id: int):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    print("PATIENT FOUND FOR NOTIFICATION:", patient.id if patient else None)

    if not patient or not patient.user_id:
        print("PATIENT NOTIFICATION SKIPPED")
        return

    print("CREATING PATIENT NOTIFICATION FOR USER:", patient.user_id)
    create_notification(
        db=db,
        user_id=patient.user_id,
        title="Reading under urgent review",
        message="Your CKD reading has been submitted and marked for urgent doctor review.",
        type="info",
        related_patient_id=patient_id,
    )


def run_prediction(db: Session, patient_id: int, reading: Reading):
    model_path = settings.MODEL_PATH
    score = confidence = None
    explanation = None

    if os.path.exists(model_path):
        bundle = joblib.load(model_path)
        model = bundle["model"]
        scaler = bundle.get("scaler")
        X = _build_feature_vector(reading)
        if scaler is not None:
            X = scaler.transform(X)
        probability = float(model.predict_proba(X)[0][1])
        score = round(probability * 100, 2)
        confidence = round(max(probability, 1 - probability), 2)
        explanation = "ML prediction generated from clinical and sensor features"
    else:
        score, confidence, explanation = _heuristic_score(reading)
        score = round(score, 2)
        confidence = round(confidence, 2)

    trend_status = _trend_status(db, patient_id, score)
    risk_level = _risk_level(score)

    print("RUN PREDICTION -> patient:", patient_id, "score:", score, "risk_level:", risk_level)

    prediction = Prediction(
        patient_id=patient_id,
        reading_id=reading.id,
        risk_score=score,
        risk_level=risk_level,
        model_confidence=confidence,
        explanation=explanation,
        trend_status=trend_status,
    )
    db.add(prediction)
    db.commit()
    db.refresh(prediction)

    generate_alerts_for_prediction(db, patient_id, prediction, reading)
    return prediction


def generate_alerts_for_prediction(db: Session, patient_id: int, prediction: Prediction, reading: Reading):
    alerts = []

    if prediction.risk_score >= 75:
        alerts.append(("risk", "High CKD risk detected. Doctor review is recommended.", "high"))

    if reading.systolic_bp and reading.systolic_bp > 140:
        alerts.append(("blood_pressure", "Blood pressure remains above target range.", "medium"))

    if prediction.trend_status == "Worsening":
        alerts.append(("trend", "Risk trend is worsening across recent readings.", "medium"))

    if reading.adherence_score is not None and reading.adherence_score < 60:
        alerts.append(("adherence", "Medication or monitoring adherence is low.", "low"))

    print("ALERT COUNT TO INSERT:", len(alerts))

    for alert_type, message, severity in alerts:
        print("INSERT ALERT:", alert_type, severity, message)
        db.add(
            Alert(
                patient_id=patient_id,
                prediction_id=prediction.id,
                alert_type=alert_type,
                message=message,
                severity=severity,
            )
        )

    db.commit()

    if prediction.risk_score >= 75:
        print("HIGH RISK TRIGGERED FOR PATIENT:", patient_id)
        notify_doctors_for_urgent_case(
            db=db,
            patient_id=patient_id,
            risk_score=prediction.risk_score,
            summary=prediction.explanation or "High CKD risk detected by ML model.",
        )
        notify_patient_for_urgent_case(
            db=db,
            patient_id=patient_id,
        )