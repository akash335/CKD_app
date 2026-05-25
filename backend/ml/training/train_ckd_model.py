"""
CKD Risk Prediction — Model Training Pipeline

Trains a Gradient Boosting classifier on clinical kidney biomarkers.
Features: creatinine, urea, eGFR, hemoglobin, age
Target: CKD risk stage (low / moderate / high / critical)

The dataset is generated from established clinical CKD staging guidelines:
- KDIGO 2024 CKD classification
- Creatinine, eGFR, urea, hemoglobin reference ranges by stage
- Age-adjusted risk factors

Outputs:
    ../models/ckd_risk_model.pkl       — trained model pipeline
    ../models/ckd_model_metadata.json  — feature names, thresholds, version
    ../data/ckd_training_data.csv      — generated training dataset

Usage:
    cd ckd-app/ml
    python -m training.train_ckd_model
"""

import json
import os
import sys
import warnings
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import classification_report, accuracy_score
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings("ignore")

# ── Paths ────────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "models"
DATA_DIR = BASE_DIR / "data"
MODEL_DIR.mkdir(exist_ok=True)
DATA_DIR.mkdir(exist_ok=True)


# ── Clinical Dataset Generator ───────────────────────────────────────────────

def generate_ckd_dataset(n_samples: int = 5000, seed: int = 42) -> pd.DataFrame:
    """
    Generate a clinically-accurate CKD dataset based on KDIGO staging guidelines.

    Stage definitions (aligned with KDIGO 2024):
        low      — eGFR ≥ 60, creatinine normal, early-stage or no CKD
        moderate — eGFR 30–59, creatinine mildly elevated (CKD Stage 3)
        high     — eGFR 15–29, creatinine elevated (CKD Stage 4)
        critical — eGFR < 15, creatinine very high (CKD Stage 5 / ESRD)

    Each stage has clinically realistic distributions for all biomarkers,
    with controlled inter-feature correlations and age-dependent adjustments.
    """
    rng = np.random.default_rng(seed)

    # Distribution parameters per risk level
    # Format: (mean, std, clip_low, clip_high)
    stage_profiles = {
        "low": {
            "creatinine": (0.9, 0.2, 0.4, 1.3),
            "urea":       (14.0, 4.0, 5.0, 22.0),
            "egfr":       (90.0, 18.0, 60.0, 140.0),
            "hemoglobin": (14.0, 1.2, 11.5, 18.0),
            "age":        (42.0, 15.0, 18, 80),
        },
        "moderate": {
            "creatinine": (1.6, 0.4, 1.0, 3.0),
            "urea":       (28.0, 8.0, 15.0, 50.0),
            "egfr":       (45.0, 10.0, 30.0, 59.0),
            "hemoglobin": (12.0, 1.3, 9.0, 15.0),
            "age":        (55.0, 12.0, 25, 90),
        },
        "high": {
            "creatinine": (3.5, 1.2, 2.0, 8.0),
            "urea":       (55.0, 15.0, 30.0, 100.0),
            "egfr":       (22.0, 5.0, 15.0, 29.0),
            "hemoglobin": (10.5, 1.5, 6.0, 13.0),
            "age":        (62.0, 10.0, 30, 95),
        },
        "critical": {
            "creatinine": (7.0, 2.5, 4.0, 20.0),
            "urea":       (90.0, 30.0, 50.0, 250.0),
            "egfr":       (8.0, 4.0, 2.0, 14.0),
            "hemoglobin": (8.5, 1.8, 4.0, 11.0),
            "age":        (65.0, 10.0, 35, 100),
        },
    }

    # Class balance: realistic prevalence (more low/moderate than critical)
    stage_weights = {"low": 0.35, "moderate": 0.30, "high": 0.20, "critical": 0.15}

    rows = []
    for stage, weight in stage_weights.items():
        n = int(n_samples * weight)
        profile = stage_profiles[stage]

        for _ in range(n):
            # Generate base values with controlled noise
            creat = rng.normal(*profile["creatinine"][:2])
            urea = rng.normal(*profile["urea"][:2])
            egfr = rng.normal(*profile["egfr"][:2])
            hgb = rng.normal(*profile["hemoglobin"][:2])
            age = rng.normal(*profile["age"][:2])

            # Add clinical correlations:
            # Higher creatinine → lower eGFR (inverse relationship)
            egfr -= (creat - profile["creatinine"][0]) * 5 * rng.uniform(0.5, 1.5)
            # Lower eGFR → lower hemoglobin (renal anemia)
            if egfr < 45:
                hgb -= rng.uniform(0, 1.5)
            # Older age → slight eGFR reduction
            if age > 60:
                egfr -= rng.uniform(0, 5)

            # Clip to realistic clinical ranges
            creat = np.clip(creat, profile["creatinine"][2], profile["creatinine"][3])
            urea = np.clip(urea, profile["urea"][2], profile["urea"][3])
            egfr = np.clip(egfr, profile["egfr"][2], profile["egfr"][3])
            hgb = np.clip(hgb, profile["hemoglobin"][2], profile["hemoglobin"][3])
            age = int(np.clip(age, profile["age"][2], profile["age"][3]))

            rows.append({
                "creatinine": round(creat, 2),
                "urea": round(urea, 1),
                "egfr": round(egfr, 1),
                "hemoglobin": round(hgb, 1),
                "age": age,
                "risk_level": stage,
            })

    df = pd.DataFrame(rows)
    # Shuffle
    df = df.sample(frac=1, random_state=seed).reset_index(drop=True)
    return df


# ── Feature Engineering ──────────────────────────────────────────────────────

FEATURE_COLUMNS = ["creatinine", "urea", "egfr", "hemoglobin", "age"]
TARGET_COLUMN = "risk_level"
RISK_CLASSES = ["low", "moderate", "high", "critical"]


def add_engineered_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add clinically-relevant derived features."""
    df = df.copy()
    # Creatinine-to-eGFR ratio (higher = worse)
    df["creat_egfr_ratio"] = df["creatinine"] / df["egfr"].clip(lower=1)
    # Urea-to-creatinine ratio (BUN/Cr ratio, clinically meaningful)
    df["urea_creat_ratio"] = df["urea"] / df["creatinine"].clip(lower=0.1)
    # Hemoglobin deficit from normal (12 g/dL threshold)
    df["hgb_deficit"] = np.maximum(0, 12.0 - df["hemoglobin"])
    # Age risk factor (exponential increase after 50)
    df["age_risk"] = np.maximum(0, (df["age"] - 50) / 10)
    # Kidney severity index (composite)
    df["kidney_severity"] = (
        (df["creatinine"] / 1.3) * 0.3 +
        (df["urea"] / 20) * 0.2 +
        (1 - df["egfr"] / 120) * 0.3 +
        df["hgb_deficit"] / 5 * 0.1 +
        df["age_risk"] / 5 * 0.1
    )
    return df


ALL_FEATURE_COLUMNS = FEATURE_COLUMNS + [
    "creat_egfr_ratio", "urea_creat_ratio", "hgb_deficit",
    "age_risk", "kidney_severity",
]


# ── Training ─────────────────────────────────────────────────────────────────

def train_model():
    """Full training pipeline — generates data, trains model, saves artifacts."""
    print("=" * 60)
    print("  CKD Risk Prediction — Model Training")
    print("=" * 60)

    # 1) Generate dataset
    print("\n📊 Generating clinical CKD dataset...")
    df = generate_ckd_dataset(n_samples=5000, seed=42)
    print(f"   Dataset shape: {df.shape}")
    print(f"   Class distribution:\n{df['risk_level'].value_counts().to_string()}")

    # Save dataset
    csv_path = DATA_DIR / "ckd_training_data.csv"
    df.to_csv(csv_path, index=False)
    print(f"   ✅ Saved to {csv_path}")

    # 2) Feature engineering
    print("\n🔧 Engineering features...")
    df = add_engineered_features(df)

    X = df[ALL_FEATURE_COLUMNS].values
    y = df[TARGET_COLUMN].values
    print(f"   Feature matrix: {X.shape}")
    print(f"   Features: {ALL_FEATURE_COLUMNS}")

    # 3) Train with cross-validation
    print("\n🧠 Training Gradient Boosting classifier...")

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("classifier", GradientBoostingClassifier(
            n_estimators=300,
            max_depth=5,
            learning_rate=0.1,
            subsample=0.8,
            min_samples_split=10,
            min_samples_leaf=5,
            random_state=42,
        )),
    ])

    # Cross-validation
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(pipeline, X, y, cv=skf, scoring="accuracy")
    print(f"   Cross-validation accuracy: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
    print(f"   Per-fold: {[f'{s:.4f}' for s in cv_scores]}")

    # 4) Train on full dataset
    print("\n📈 Training final model on full dataset...")
    pipeline.fit(X, y)

    # Final training metrics
    y_pred = pipeline.predict(X)
    train_acc = accuracy_score(y, y_pred)
    print(f"   Training accuracy: {train_acc:.4f}")
    print(f"\n   Classification Report:")
    print(classification_report(y, y_pred, target_names=RISK_CLASSES))

    # 5) Save model
    model_path = MODEL_DIR / "ckd_risk_model.pkl"
    joblib.dump(pipeline, model_path)
    print(f"   ✅ Model saved to {model_path}")
    print(f"   Model file size: {model_path.stat().st_size / 1024:.1f} KB")

    # 6) Save metadata
    metadata = {
        "model_name": "ckd_risk_classifier",
        "version": "1.0.0",
        "algorithm": "GradientBoostingClassifier",
        "feature_columns": ALL_FEATURE_COLUMNS,
        "raw_input_columns": FEATURE_COLUMNS,
        "target_column": TARGET_COLUMN,
        "risk_classes": RISK_CLASSES,
        "training_samples": len(df),
        "cv_accuracy_mean": round(cv_scores.mean(), 4),
        "cv_accuracy_std": round(cv_scores.std(), 4),
        "training_accuracy": round(train_acc, 4),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "feature_ranges": {
            "creatinine": {"min": 0.1, "max": 30.0, "unit": "mg/dL"},
            "urea": {"min": 1.0, "max": 300.0, "unit": "mg/dL"},
            "egfr": {"min": 1.0, "max": 150.0, "unit": "mL/min"},
            "hemoglobin": {"min": 2.0, "max": 25.0, "unit": "g/dL"},
            "age": {"min": 1, "max": 120, "unit": "years"},
        },
    }

    meta_path = MODEL_DIR / "ckd_model_metadata.json"
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"   ✅ Metadata saved to {meta_path}")

    # 7) Verification — quick smoke test
    print("\n🧪 Smoke test predictions:")
    test_cases = [
        {"creatinine": 0.9, "urea": 12, "egfr": 95, "hemoglobin": 14.5, "age": 35, "expected": "low"},
        {"creatinine": 1.6, "urea": 30, "egfr": 45, "hemoglobin": 12.0, "age": 55, "expected": "moderate"},
        {"creatinine": 3.5, "urea": 60, "egfr": 22, "hemoglobin": 10.0, "age": 65, "expected": "high"},
        {"creatinine": 8.0, "urea": 100, "egfr": 7, "hemoglobin": 7.5, "age": 70, "expected": "critical"},
    ]

    for tc in test_cases:
        sample = pd.DataFrame([{k: tc[k] for k in FEATURE_COLUMNS}])
        sample = add_engineered_features(sample)
        pred = pipeline.predict(sample[ALL_FEATURE_COLUMNS])[0]
        proba = pipeline.predict_proba(sample[ALL_FEATURE_COLUMNS])[0]
        conf = max(proba) * 100
        status = "✅" if pred == tc["expected"] else "⚠️"
        print(f"   {status} Input: creat={tc['creatinine']}, egfr={tc['egfr']} → {pred} ({conf:.0f}%) [expected: {tc['expected']}]")

    print("\n" + "=" * 60)
    print("  ✅ Training complete!")
    print("=" * 60)

    return pipeline


if __name__ == "__main__":
    train_model()
