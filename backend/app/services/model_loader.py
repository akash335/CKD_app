"""
ML Model Loader — singleton module that loads the trained CKD model once at startup.

The model is loaded into module-level globals and reused across all requests.
This avoids re-loading the .pkl file on every prediction call.

Usage:
    from app.services.model_loader import get_model, get_metadata, is_model_loaded
"""

import json
import logging
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# ── Module-level singleton state ─────────────────────────────────────────────

_model = None
_metadata: Optional[dict] = None
_model_loaded = False

# Model file paths — resolved within the backend directory for deployment safety
_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent  # .../ckd-app/backend
_MODEL_DIR = _BACKEND_DIR / "ml" / "models"
_MODEL_PATH = _MODEL_DIR / "ckd_risk_model.pkl"
_METADATA_PATH = _MODEL_DIR / "ckd_model_metadata.json"

# Feature columns — must match training exactly
RAW_INPUT_COLUMNS = ["creatinine", "urea", "egfr", "hemoglobin", "age"]

ALL_FEATURE_COLUMNS = [
    "creatinine", "urea", "egfr", "hemoglobin", "age",
    "creat_egfr_ratio", "urea_creat_ratio", "hgb_deficit",
    "age_risk", "kidney_severity",
]

RISK_CLASSES = ["low", "moderate", "high", "critical"]


# ── Feature Engineering (must match training) ────────────────────────────────

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add derived features that match the training pipeline exactly.

    This function MUST stay in sync with train_ckd_model.add_engineered_features().
    """
    df = df.copy()
    # Creatinine-to-eGFR ratio (higher = worse kidney function)
    df["creat_egfr_ratio"] = df["creatinine"] / df["egfr"].clip(lower=1)
    # Urea-to-creatinine ratio (BUN/Cr ratio)
    df["urea_creat_ratio"] = df["urea"] / df["creatinine"].clip(lower=0.1)
    # Hemoglobin deficit from normal (12 g/dL threshold)
    df["hgb_deficit"] = np.maximum(0, 12.0 - df["hemoglobin"])
    # Age risk factor (increases after 50)
    df["age_risk"] = np.maximum(0, (df["age"] - 50) / 10)
    # Composite kidney severity index
    df["kidney_severity"] = (
        (df["creatinine"] / 1.3) * 0.3 +
        (df["urea"] / 20) * 0.2 +
        (1 - df["egfr"] / 120) * 0.3 +
        df["hgb_deficit"] / 5 * 0.1 +
        df["age_risk"] / 5 * 0.1
    )
    return df


# ── Model Loading ────────────────────────────────────────────────────────────

def load_model() -> bool:
    """
    Load the trained model and metadata from disk.
    
    Called once at application startup. Returns True if successful.
    Thread-safe: module-level assignment is atomic in CPython.
    """
    global _model, _metadata, _model_loaded

    if not _MODEL_PATH.exists():
        logger.error(f"❌ Model file not found: {_MODEL_PATH}")
        logger.error("   Run: python -m ml.training.train_ckd_model")
        return False

    try:
        _model = joblib.load(_MODEL_PATH)
        logger.info(f"✅ CKD model loaded from {_MODEL_PATH}")
    except Exception as e:
        logger.error(f"❌ Failed to load model: {e}")
        return False

    if _METADATA_PATH.exists():
        try:
            with open(_METADATA_PATH) as f:
                _metadata = json.load(f)
            logger.info(f"✅ Model metadata loaded (v{_metadata.get('version', '?')})")
        except Exception as e:
            logger.warning(f"⚠️ Failed to load metadata: {e}")
            _metadata = {}
    else:
        _metadata = {}

    _model_loaded = True
    return True


def get_model():
    """Return the loaded sklearn pipeline. None if not loaded."""
    return _model


def get_metadata() -> dict:
    """Return model metadata dict."""
    return _metadata or {}


def is_model_loaded() -> bool:
    """Check if the model is loaded and ready for inference."""
    return _model_loaded and _model is not None
