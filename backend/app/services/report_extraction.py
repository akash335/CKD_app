"""Medical report text extraction and data parsing service."""

import logging

log = logging.getLogger(__name__)

import re
from typing import Optional
from io import BytesIO
from pydantic import BaseModel, Field


class ExtractedReportData(BaseModel):
    """Extracted lab values from medical report."""
    creatinine: Optional[float] = Field(None, ge=0.1, le=30.0)
    urea: Optional[float] = Field(None, ge=1.0, le=300.0)
    egfr: Optional[float] = Field(None, ge=1.0, le=150.0)
    hemoglobin: Optional[float] = Field(None, ge=2.0, le=25.0)
    age: Optional[int] = Field(None, ge=1, le=120)


def extract_text_from_report(file_content: bytes, filename: str) -> str:
    """
    Extract text from PDF or image files.
    
    For PDFs: uses PyPDF2
    For images: uses pytesseract
    """
    text = ""
    
    if filename.lower().endswith(".pdf"):
        try:
            import PyPDF2
            pdf_reader = PyPDF2.PdfReader(BytesIO(file_content))
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
        except Exception as e:
            log.warning("PDF extraction error: %s", e)
            text = ""
    
    elif filename.lower().endswith((".png", ".jpg", ".jpeg")):
        try:
            import pytesseract
            from PIL import Image
            image = Image.open(BytesIO(file_content))
            text = pytesseract.image_to_string(image)
        except Exception as e:
            log.warning("Image OCR error: %s", e)
            text = ""
    
    return text


def parse_lab_values(text: str) -> ExtractedReportData:
    """
    Parse lab values from extracted text using regex patterns.
    
    Returns a dict with found values. Missing values are None.
    """
    
    data = {
        "creatinine": None,
        "urea": None,
        "egfr": None,
        "hemoglobin": None,
        "age": None,
    }
    
    # Normalize text
    text_lower = text.lower()
    
    # Extract Creatinine
    creatinine_patterns = [
        r"(?:serum\s+)?creatinine[\s:]*(\d+\.?\d*)\s*(?:mg/dL|mg/dl|mg\/dl)",
        r"(?:cr|scr)[\s:]*(\d+\.?\d*)\s*(?:mg/dL|mg/dl|mg\/dl)",
    ]
    for pattern in creatinine_patterns:
        match = re.search(pattern, text_lower)
        if match:
            try:
                val = float(match.group(1))
                if 0.1 <= val <= 30.0:
                    data["creatinine"] = val
                    break
            except ValueError:
                pass
    
    # Extract Urea/BUN (Blood Urea Nitrogen)
    urea_patterns = [
        r"(?:blood\s+)?urea\s+nitrogen[\s:]*(\d+\.?\d*)\s*(?:mg/dL|mg/dl|mg\/dl)",
        r"(?:urea|bun)[\s:]*(\d+\.?\d*)\s*(?:mg/dL|mg/dl|mg\/dl)",
        r"blood\s+urea[\s:]*(\d+\.?\d*)",
    ]
    for pattern in urea_patterns:
        match = re.search(pattern, text_lower)
        if match:
            try:
                val = float(match.group(1))
                if 1.0 <= val <= 300.0:
                    data["urea"] = val
                    break
            except ValueError:
                pass
    
    # Extract eGFR (estimated Glomerular Filtration Rate)
    egfr_patterns = [
        r"(?:estimated\s+)?(?:glomerular\s+filtration\s+rate|egfr)[\s:]*(\d+\.?\d*)\s*(?:mL/min|ml/min|ml\/min)",
        r"egfr[\s:]*(\d+\.?\d*)\s*(?:mL/min|ml/min|ml\/min|\/1\.73m2)",
        r"gfr[\s:]*(\d+\.?\d*)",
    ]
    for pattern in egfr_patterns:
        match = re.search(pattern, text_lower)
        if match:
            try:
                val = float(match.group(1))
                if 1.0 <= val <= 150.0:
                    data["egfr"] = val
                    break
            except ValueError:
                pass
    
    # Extract Hemoglobin
    hemoglobin_patterns = [
        r"hemoglobin[\s:]*(\d+\.?\d*)\s*(?:g/dL|g/dl|g\/dl|gm%)",
        r"hb[\s:]*(\d+\.?\d*)\s*(?:g/dL|g/dl|g\/dl)",
        r"hgb[\s:]*(\d+\.?\d*)",
    ]
    for pattern in hemoglobin_patterns:
        match = re.search(pattern, text_lower)
        if match:
            try:
                val = float(match.group(1))
                if 2.0 <= val <= 25.0:
                    data["hemoglobin"] = val
                    break
            except ValueError:
                pass
    
    # Extract Age
    age_patterns = [
        r"(?:patient\s+)?age[\s:]*(\d+)\s*(?:years|yrs|y|yo)",
        r"age[\s:]*(\d+)",
        r"(\d+)\s+(?:years|yrs)\s+(?:old|male|female)",
    ]
    for pattern in age_patterns:
        match = re.search(pattern, text_lower)
        if match:
            try:
                age = int(match.group(1))
                if 1 <= age <= 120:
                    data["age"] = age
                    break
            except ValueError:
                pass
    
    return ExtractedReportData(**data)


async def extract_medical_report_data(file_content: bytes, filename: str) -> ExtractedReportData:
    """
    Main function to extract medical data from uploaded file.
    
    Returns ExtractedReportData with found lab values. Missing values are None.
    """
    # Extract text from file
    text = extract_text_from_report(file_content, filename)
    
    if not text or len(text.strip()) < 5:
        raise ValueError("Could not extract text from file. Please ensure the file is readable.")
    
    log.debug("Extracted %d characters from report", len(text))
    
    # Parse lab values from text
    data = parse_lab_values(text)
    
    log.debug("Parsed data: %s", data)
    
    # At least one required field should be found
    if all(v is None for v in [data.creatinine, data.urea, data.egfr, data.hemoglobin]):
        raise ValueError(
            "Could not find any standard lab values in the report. "
            "Please ensure it contains lab results for: Creatinine, Urea, eGFR, or Hemoglobin."
        )
    
    return data

