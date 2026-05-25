"""
CKD Risk Prediction Service — real ML model inference.

Replaces the mock heuristic logic with actual trained model predictions.
Uses the globally loaded GradientBoosting model via model_loader.

All three input modes (hospital, urea, lcr) produce predictions using
the same underlying trained model with appropriate input handling.
"""

import logging
from typing import Optional

import numpy as np

from app.schemas.prediction import (
    HospitalInput,
    UreaInput,
    LCRInput,
    PredictionResponse,
    RiskLevel,
)
from app.services.model_loader import (
    get_model,
    is_model_loaded,
)

logger = logging.getLogger(__name__)


# ── Clinical Reference Ranges ────────────────────────────────────────────────

REFERENCE_RANGES = {
    "creatinine": {"low": 0.7, "high": 1.3, "unit": "mg/dL", "name": "Serum Creatinine"},
    "urea":       {"low": 7.0, "high": 20.0, "unit": "mg/dL", "name": "Blood Urea"},
    "egfr":       {"low": 60.0, "high": 120.0, "unit": "mL/min", "name": "eGFR"},
    "hemoglobin": {"low": 12.0, "high": 17.0, "unit": "g/dL", "name": "Hemoglobin"},
}


# ── Default Values for Missing Inputs ────────────────────────────────────────
# When a biomarker is not provided, we use a "normal" default so the model
# doesn't artificially inflate risk from missing data.

DEFAULTS = {
    "creatinine": 1.0,
    "urea": 15.0,
    "egfr": 90.0,
    "hemoglobin": 14.0,
    "age": 45,
}


# ── Core Prediction Engine ───────────────────────────────────────────────────

def _run_model_prediction(
    creatinine: float,
    urea: float,
    egfr: float,
    hemoglobin: float,
    age: int,
) -> tuple[str, float, dict[str, float]]:
    """
    Run the trained ML model and return (risk_level, confidence, class_probabilities).

    Optimized: uses numpy arrays directly instead of creating a pandas
    DataFrame per call. Feature engineering is done with scalar math.
    
    Raises RuntimeError if the model is not loaded.
    """
    if not is_model_loaded():
        raise RuntimeError(
            "ML model is not loaded. Run: python -m ml.training.train_ckd_model"
        )

    model = get_model()

    # Feature engineering — matches engineer_features() exactly but avoids DataFrame
    egfr_safe = max(egfr, 1.0)
    creat_safe = max(creatinine, 0.1)

    creat_egfr_ratio = creatinine / egfr_safe
    urea_creat_ratio = urea / creat_safe
    hgb_deficit = max(0.0, 12.0 - hemoglobin)
    age_risk = max(0.0, (age - 50) / 10.0)
    kidney_severity = (
        (creatinine / 1.3) * 0.3 +
        (urea / 20.0) * 0.2 +
        (1.0 - egfr / 120.0) * 0.3 +
        hgb_deficit / 5.0 * 0.1 +
        age_risk / 5.0 * 0.1
    )

    # Build feature vector in the exact order ALL_FEATURE_COLUMNS expects
    # [creatinine, urea, egfr, hemoglobin, age,
    #  creat_egfr_ratio, urea_creat_ratio, hgb_deficit, age_risk, kidney_severity]
    X = np.array([[
        creatinine, urea, egfr, hemoglobin, float(age),
        creat_egfr_ratio, urea_creat_ratio, hgb_deficit, age_risk, kidney_severity,
    ]])

    # Predict class and probabilities
    predicted_class = model.predict(X)[0]
    probabilities = model.predict_proba(X)[0]

    # Map probabilities to class names — O(K) where K = number of classes (4)
    class_names = model.classes_
    class_proba = dict(zip(class_names, probabilities.astype(float)))

    # Confidence = probability of the predicted class
    confidence = float(probabilities.max()) * 100

    return predicted_class, confidence, class_proba


def _analyze_contributing_factors(
    creatinine: float,
    urea: float,
    egfr: float,
    hemoglobin: float,
    age: Optional[int],
    risk_level: str,
    class_proba: dict[str, float],
) -> list[str]:
    """
    Generate clinically meaningful contributing factor descriptions
    based on actual lab values and their deviation from reference ranges.
    """
    factors = []

    # Creatinine analysis
    ref = REFERENCE_RANGES["creatinine"]
    if creatinine > 5.0:
        factors.append(
            f"Severely elevated creatinine ({creatinine:.1f} {ref['unit']} — "
            f"normal: {ref['low']}–{ref['high']}). Indicates significant kidney impairment."
        )
    elif creatinine > 2.0:
        factors.append(
            f"Elevated creatinine ({creatinine:.1f} {ref['unit']} — "
            f"normal: {ref['low']}–{ref['high']}). Kidneys may be struggling to filter waste."
        )
    elif creatinine > ref["high"]:
        factors.append(
            f"Mildly elevated creatinine ({creatinine:.1f} {ref['unit']} — "
            f"normal: {ref['low']}–{ref['high']})."
        )
    elif creatinine <= ref["high"]:
        factors.append(
            f"Creatinine within normal range ({creatinine:.1f} {ref['unit']})."
        )

    # eGFR analysis
    ref = REFERENCE_RANGES["egfr"]
    if egfr < 15:
        factors.append(
            f"Critically low eGFR ({egfr:.0f} {ref['unit']}). "
            f"Stage 5 CKD / kidney failure — dialysis or transplant may be needed."
        )
    elif egfr < 30:
        factors.append(
            f"Severely reduced eGFR ({egfr:.0f} {ref['unit']} — normal: >{ref['low']}). "
            f"Stage 4 CKD — nephrology referral strongly recommended."
        )
    elif egfr < 60:
        factors.append(
            f"Moderately reduced eGFR ({egfr:.0f} {ref['unit']} — normal: >{ref['low']}). "
            f"Stage 3 CKD — regular monitoring required."
        )
    else:
        factors.append(
            f"eGFR within normal range ({egfr:.0f} {ref['unit']})."
        )

    # Urea analysis
    ref = REFERENCE_RANGES["urea"]
    if urea > 60:
        factors.append(
            f"Very high urea ({urea:.0f} {ref['unit']} — normal: {ref['low']}–{ref['high']}). "
            f"Suggests significant kidney dysfunction or dehydration."
        )
    elif urea > ref["high"]:
        factors.append(
            f"Elevated urea ({urea:.0f} {ref['unit']} — normal: {ref['low']}–{ref['high']})."
        )

    # Hemoglobin analysis
    ref = REFERENCE_RANGES["hemoglobin"]
    if hemoglobin < 8:
        factors.append(
            f"Severely low hemoglobin ({hemoglobin:.1f} {ref['unit']}). "
            f"Severe anemia — likely CKD-related. Iron/EPO therapy may be needed."
        )
    elif hemoglobin < 10:
        factors.append(
            f"Low hemoglobin ({hemoglobin:.1f} {ref['unit']} — normal: >{ref['low']}). "
            f"Moderate anemia, possibly CKD-related."
        )
    elif hemoglobin < ref["low"]:
        factors.append(
            f"Below-normal hemoglobin ({hemoglobin:.1f} {ref['unit']} — normal: >{ref['low']})."
        )

    # Age factor
    if age and age > 65:
        factors.append(
            f"Age ({age} years) is a significant risk factor for CKD progression."
        )
    elif age and age > 50:
        factors.append(
            f"Age ({age} years) is a contributing factor."
        )

    # Model confidence note
    if class_proba:
        sorted_proba = sorted(class_proba.items(), key=lambda x: x[1], reverse=True)
        if len(sorted_proba) >= 2:
            top_prob = sorted_proba[0][1]
            second_prob = sorted_proba[1][1]
            if top_prob - second_prob < 0.2:
                factors.append(
                    f"Note: The model shows uncertainty between "
                    f"{sorted_proba[0][0]} ({sorted_proba[0][1]*100:.0f}%) and "
                    f"{sorted_proba[1][0]} ({sorted_proba[1][1]*100:.0f}%). "
                    f"Clinical judgment should be applied."
                )

    if not factors:
        factors.append("All lab values appear within normal ranges.")

    return factors


def _calculate_health_score(risk_level: str, class_proba: dict[str, float]) -> int:
    """
    Calculate a 0–100 health score based on model probabilities.

    Weighted combination: higher probability of severe classes → lower score.
    """
    severity_weights = {"low": 0, "moderate": 30, "high": 60, "critical": 90}

    weighted_severity = sum(
        class_proba.get(cls, 0) * weight
        for cls, weight in severity_weights.items()
    )

    # Health score is inverse of severity
    health_score = max(0, min(100, int(100 - weighted_severity)))
    return health_score


def _build_explanation(risk_level: str, factors: list[str], confidence: float) -> str:
    """Generate a clear, clinical-grade explanation summary."""
    intros = {
        "low": "Based on the ML analysis of your lab values, CKD risk appears low.",
        "moderate": "The ML model indicates a moderate CKD risk that warrants regular monitoring.",
        "high": "The trained model predicts a high CKD risk requiring prompt medical attention.",
        "critical": "Critical CKD risk detected by the ML model — immediate medical consultation is strongly recommended.",
    }

    intro = intros.get(risk_level, "Risk assessment completed.")
    factor_count = len([f for f in factors if not f.startswith("Note:")])

    return (
        f"{intro} "
        f"This prediction is based on {factor_count} clinical indicator(s) "
        f"with {confidence:.0f}% model confidence."
    )


# ── Public Prediction Functions ──────────────────────────────────────────────

def predict_hospital(data: HospitalInput) -> PredictionResponse:
    """
    Run CKD prediction from hospital lab values using the trained ML model.

    Uses all 5 clinical features: creatinine, urea, eGFR, hemoglobin, age.
    """
    age = data.age if data.age is not None else DEFAULTS["age"]

    risk_level, confidence, class_proba = _run_model_prediction(
        creatinine=data.creatinine,
        urea=data.urea,
        egfr=data.egfr,
        hemoglobin=data.hemoglobin,
        age=age,
    )

    factors = _analyze_contributing_factors(
        creatinine=data.creatinine,
        urea=data.urea,
        egfr=data.egfr,
        hemoglobin=data.hemoglobin,
        age=data.age,
        risk_level=risk_level,
        class_proba=class_proba,
    )

    health_score = _calculate_health_score(risk_level, class_proba)
    explanation = _build_explanation(risk_level, factors, confidence)

    return PredictionResponse(
        risk_level=RiskLevel(risk_level),
        confidence=round(confidence, 1),
        health_score=health_score,
        explanation=explanation,
        contributing_factors=factors,
        input_mode="hospital",
    )


def predict_urea(data: UreaInput) -> PredictionResponse:
    """
    Run CKD prediction from urea-only input using the trained ML model.

    Since only urea is provided, other features use clinically-informed defaults.
    The model still runs with all features but confidence is naturally lower
    because defaults reduce discriminative power.
    """
    # Estimate other values from urea using clinical heuristics
    # Higher urea → likely higher creatinine, lower eGFR
    estimated_creatinine = DEFAULTS["creatinine"]
    estimated_egfr = DEFAULTS["egfr"]
    estimated_hemoglobin = DEFAULTS["hemoglobin"]

    if data.urea > 60:
        estimated_creatinine = 4.0
        estimated_egfr = 18.0
        estimated_hemoglobin = 9.0
    elif data.urea > 40:
        estimated_creatinine = 2.5
        estimated_egfr = 35.0
        estimated_hemoglobin = 11.0
    elif data.urea > 20:
        estimated_creatinine = 1.5
        estimated_egfr = 55.0
        estimated_hemoglobin = 12.5

    risk_level, confidence, class_proba = _run_model_prediction(
        creatinine=estimated_creatinine,
        urea=data.urea,
        egfr=estimated_egfr,
        hemoglobin=estimated_hemoglobin,
        age=DEFAULTS["age"],
    )

    # Reduce confidence for single-metric analysis
    confidence = min(confidence, 70.0)

    factors = _analyze_contributing_factors(
        creatinine=estimated_creatinine,
        urea=data.urea,
        egfr=estimated_egfr,
        hemoglobin=estimated_hemoglobin,
        age=None,
        risk_level=risk_level,
        class_proba=class_proba,
    )
    factors.append(
        "Note: Urea-only analysis uses estimated values for other biomarkers. "
        "Consider a full lab panel for higher accuracy."
    )

    health_score = _calculate_health_score(risk_level, class_proba)
    explanation = _build_explanation(risk_level, factors, confidence)

    return PredictionResponse(
        risk_level=RiskLevel(risk_level),
        confidence=round(confidence, 1),
        health_score=health_score,
        explanation=explanation,
        contributing_factors=factors,
        input_mode="urea",
    )


def predict_lcr(data: LCRInput) -> PredictionResponse:
    """
    Run CKD prediction from LCR sensor readings using the trained ML model.

    LCR sensor values (resistance, capacitance, inductance) are converted
    to estimated clinical biomarkers using calibration curves, then fed
    to the same trained model.
    """
    # Convert LCR sensor values to estimated clinical biomarkers
    # These calibration curves are approximations based on LCR-to-urea research
    estimated_urea = _lcr_to_urea(data.resistance, data.capacitance)
    estimated_creatinine = _estimate_creatinine_from_urea(estimated_urea)
    estimated_egfr = _estimate_egfr_from_creatinine(estimated_creatinine)
    estimated_hemoglobin = DEFAULTS["hemoglobin"]

    if estimated_urea > 40:
        estimated_hemoglobin = 10.5

    risk_level, confidence, class_proba = _run_model_prediction(
        creatinine=estimated_creatinine,
        urea=estimated_urea,
        egfr=estimated_egfr,
        hemoglobin=estimated_hemoglobin,
        age=DEFAULTS["age"],
    )

    # Reduce confidence for sensor-derived values
    confidence = min(confidence, 65.0)

    factors = []
    factors.append(f"LCR Resistance: {data.resistance:.0f} Ω")
    factors.append(f"LCR Capacitance: {data.capacitance:.1f} µF")
    factors.append(f"LCR Inductance: {data.inductance:.1f} mH")
    factors.append(f"Estimated urea from sensor: {estimated_urea:.1f} mg/dL")

    if estimated_urea > 40:
        factors.append("Sensor readings suggest elevated urea levels.")
    elif estimated_urea < 20:
        factors.append("Sensor readings suggest normal urea levels.")

    factors.append(
        "Note: LCR sensor predictions use estimated biomarker values. "
        "Verify with laboratory blood tests for clinical decisions."
    )

    health_score = _calculate_health_score(risk_level, class_proba)
    explanation = _build_explanation(risk_level, factors, confidence)

    return PredictionResponse(
        risk_level=RiskLevel(risk_level),
        confidence=round(confidence, 1),
        health_score=health_score,
        explanation=explanation,
        contributing_factors=factors,
        input_mode="lcr",
    )


# ── LCR Sensor Conversion Helpers ────────────────────────────────────────────

def _lcr_to_urea(resistance: float, capacitance: float) -> float:
    """
    Estimate urea concentration from LCR sensor readings.
    
    Based on impedance spectroscopy calibration:
    Higher resistance + higher capacitance → higher urea concentration.
    """
    # Simplified calibration curve
    urea = 5.0 + (resistance / 50.0) + (capacitance / 10.0)
    return np.clip(urea, 5.0, 200.0)


def _estimate_creatinine_from_urea(urea: float) -> float:
    """Estimate creatinine from urea using BUN/Cr ratio (~10:1 in normal)."""
    # BUN = urea * 0.467 (conversion factor)
    bun = urea * 0.467
    creatinine = bun / 12.0  # Normal BUN/Cr ratio ~10-20:1
    return np.clip(creatinine, 0.4, 15.0)


def _estimate_egfr_from_creatinine(creatinine: float, age: int = 45) -> float:
    """Estimate eGFR using simplified CKD-EPI-like formula."""
    if creatinine <= 0:
        return 120.0
    # Simplified: eGFR ≈ 175 * Cr^-1.154 * Age^-0.203 (MDRD-like)
    egfr = 175 * (creatinine ** -1.154) * (age ** -0.203)
    return np.clip(egfr, 2.0, 140.0)
