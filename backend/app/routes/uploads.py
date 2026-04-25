import os
import re
import shutil
from tempfile import NamedTemporaryFile
from uuid import uuid4

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from sqlalchemy.orm import Session
from PIL import Image
import pytesseract

from ..database import get_db
from ..services.upload_service import save_excel_readings
from ..services.prediction_service import run_prediction
from .deps import get_current_user

router = APIRouter(prefix="/uploads", tags=["uploads"])

UPLOAD_DIR = "uploads"
REPORT_DIR = os.path.join(UPLOAD_DIR, "reports")
os.makedirs(REPORT_DIR, exist_ok=True)


def _find_number(patterns, text: str):
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                return float(match.group(1))
            except Exception:
                pass
    return None


def _extract_ckd_values_from_text(text: str):
    normalized = text.replace(",", " ").replace("\n", " ")

    creatinine_value = _find_number(
        [
            r"creatinine[^0-9]{0,20}(\d+(?:\.\d+)?)",
            r"serum creatinine[^0-9]{0,20}(\d+(?:\.\d+)?)",
        ],
        normalized,
    )

    acr = _find_number(
        [
            r"\bacr\b[^0-9]{0,20}(\d+(?:\.\d+)?)",
            r"albumin[^0-9]{0,20}creatinine ratio[^0-9]{0,20}(\d+(?:\.\d+)?)",
        ],
        normalized,
    )

    egfr = _find_number(
        [
            r"\begfr\b[^0-9]{0,20}(\d+(?:\.\d+)?)",
            r"estimated gfr[^0-9]{0,20}(\d+(?:\.\d+)?)",
        ],
        normalized,
    )

    systolic_bp = None
    diastolic_bp = None
    bp_match = re.search(r"\b(\d{2,3})\s*/\s*(\d{2,3})\b", normalized)
    if bp_match:
        try:
            systolic_bp = float(bp_match.group(1))
            diastolic_bp = float(bp_match.group(2))
        except Exception:
            pass

    urine_albumin = _find_number(
        [
            r"urine albumin[^0-9]{0,20}(\d+(?:\.\d+)?)",
            r"albumin[^0-9]{0,20}(\d+(?:\.\d+)?)",
        ],
        normalized,
    )

    glucose = _find_number(
        [
            r"glucose[^0-9]{0,20}(\d+(?:\.\d+)?)",
            r"blood glucose[^0-9]{0,20}(\d+(?:\.\d+)?)",
        ],
        normalized,
    )

    return {
        "creatinine_value": creatinine_value,
        "urine_albumin": urine_albumin,
        "acr": acr,
        "egfr": egfr,
        "systolic_bp": systolic_bp,
        "diastolic_bp": diastolic_bp,
        "glucose": glucose,
    }


@router.post("/excel/{patient_id}")
def upload_excel(
    patient_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if not (
        file.filename.endswith(".csv")
        or file.filename.endswith(".xlsx")
        or file.filename.endswith(".xls")
    ):
        raise HTTPException(status_code=400, detail="Upload CSV or Excel file only")

    suffix = os.path.splitext(file.filename)[1]
    with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        temp_path = tmp.name

    readings = save_excel_readings(db, patient_id, temp_path)
    for reading in readings:
        run_prediction(db, patient_id, reading)

    os.remove(temp_path)
    return {
        "message": "File processed successfully",
        "rows_saved": len(readings),
        "note": "Sensor workbooks are auto-converted when clinical columns are not found.",
    }


@router.post("/report-image")
def upload_report_image(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    allowed_types = {
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
    }

    content_type = (file.content_type or "").lower()
    if content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Upload JPG, PNG, or WEBP image only",
        )

    ext = allowed_types[content_type]
    filename = f"{uuid4().hex}{ext}"
    save_path = os.path.join(REPORT_DIR, filename)

    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "message": "Report image uploaded successfully",
        "filename": filename,
        "report_image_path": f"/uploads/reports/{filename}",
    }


@router.post("/report-extract")
def extract_report_values(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    allowed_types = {
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
    }

    content_type = (file.content_type or "").lower()
    if content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Upload JPG, PNG, or WEBP image only")

    ext = allowed_types[content_type]
    filename = f"{uuid4().hex}{ext}"
    save_path = os.path.join(REPORT_DIR, filename)

    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        text = pytesseract.image_to_string(Image.open(save_path))
        extracted = _extract_ckd_values_from_text(text)

        return {
            "message": "Report processed successfully",
            "report_image_path": f"/uploads/reports/{filename}",
            "extracted_values": extracted,
            "raw_text": text,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Report extraction failed: {str(exc)}")