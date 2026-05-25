"""Hospital data API routes."""

from fastapi import APIRouter, UploadFile, File
from app.schemas.prediction import HospitalInput, PredictionResponse
from app.services.prediction import predict_hospital
from app.services.report_extraction import extract_medical_report_data

router = APIRouter(prefix="/api/hospital", tags=["Hospital"])


@router.get("/reports")
async def get_reports():
    """Fetch hospital lab reports for the authenticated patient."""
    # TODO: Implement with database query
    return {"reports": [], "total": 0}


@router.post("/predict", response_model=PredictionResponse)
async def predict_from_hospital(data: HospitalInput):
    """Run CKD prediction from hospital lab data."""
    return predict_hospital(data)


@router.post("/extract-report")
async def extract_report(file: UploadFile = File(...)):
    """
    Extract lab values from uploaded medical report (PDF or image).
    
    Returns extracted creatinine, urea, eGFR, and hemoglobin values.
    """
    if not file.filename:
        raise ValueError("No filename provided")
    
    # Validate file type
    valid_types = {"application/pdf", "image/png", "image/jpeg", "image/jpg"}
    if file.content_type not in valid_types:
        raise ValueError(f"Invalid file type. Supported: PDF, PNG, JPG")
    
    # Read file content
    content = await file.read()
    if len(content) == 0:
        raise ValueError("File is empty")
    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        raise ValueError("File size exceeds 10MB limit")
    
    # Extract data
    extracted = await extract_medical_report_data(content, file.filename)
    
    return extracted.model_dump()
