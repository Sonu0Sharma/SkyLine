import io
import os
import PyPDF2
import docx
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Dict, Any, Optional

# Import the new schema
from backend.schemas import UserProfile
from backend.services.scraper import extract_job_text
from backend.services.llm_engine import LLMEngine
from backend.services.ats_engine import get_ats_report  # existing v1 engine (kept for compatibility)

# NEW imports for v2
from backend.services.text_cleaner import clean_text
from backend.services.ats_engine_v2.orchestrator import run_ats_v2

# Optional OCR imports (used only if selectable text extraction fails)
# These imports are wrapped in try/except so the router works even when OCR deps are not installed.
try:
    from pdf2image import convert_from_bytes
    import pytesseract
    OCR_AVAILABLE = True
except Exception:
    OCR_AVAILABLE = False

router = APIRouter(prefix="/resume", tags=["Resume"])

# --- Request Models ---
class ScrapeRequest(BaseModel):
    url: str

class GenerateRequest(BaseModel):
    profile: Dict[str, Any]
    job_description: str
    template_style: str = "modern"

class AtsRequest(BaseModel):  # v1 compatibility
    resume_text: str
    jd_text: str

class AtsV2Request(BaseModel):
    resume_text: Optional[str] = None
    jd_text: str

# --- Utility: attempt OCR on PDF bytes if selectable text is insufficient ---
def _attempt_ocr_on_pdf_bytes(file_bytes: bytes) -> str:
    """
    Convert PDF bytes to images and run Tesseract OCR on each page.
    Returns concatenated OCR text. If OCR not available or fails, returns empty string.
    """
    if not OCR_AVAILABLE:
        return ""
    try:
        images = convert_from_bytes(file_bytes, dpi=200, fmt='jpeg')
        ocr_pages = []
        for img in images:
            # pytesseract may throw if not configured; keep this safe
            try:
                txt = pytesseract.image_to_string(img, lang='eng')
            except Exception:
                txt = ""
            ocr_pages.append(txt)
        ocr_text = "\n\n".join(ocr_pages)
        return ocr_text or ""
    except Exception:
        return ""

# --- ENDPOINT 1: Upload & Parse Resume (PDF/DOCX) ---
@router.post("/upload-resume")
async def parse_resume(file: UploadFile = File(...)):
    """
    Upload a resume (PDF/DOCX). This endpoint:
      - Extracts text via PyPDF2/docx
      - If extracted text is too short and OCR libs are available, attempts OCR
      - Cleans the text via text_cleaner.clean_text
      - Returns {"filename": ..., "content": ...}
    """
    content = ""
    try:
        file_bytes = await file.read()
        filename = file.filename.lower()

        if filename.endswith(".pdf"):
            # Try PyPDF2 text extraction first (fast & non-OCR)
            try:
                pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
                pages_text = []
                for page in pdf_reader.pages:
                    text = page.extract_text() or ""
                    pages_text.append(text)
                content = "\n\n".join(pages_text)
            except Exception:
                content = ""

            # If extracted text is very short, attempt OCR (image-based PDF)
            if not content or len(content.strip()) < 200:
                ocr_text = _attempt_ocr_on_pdf_bytes(file_bytes)
                if ocr_text and len(ocr_text.strip()) > len(content or ""):
                    content = ocr_text

        elif filename.endswith(".docx"):
            try:
                doc = docx.Document(io.BytesIO(file_bytes))
                paras = [para.text for para in doc.paragraphs]
                content = "\n".join(paras)
            except Exception:
                content = ""
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type. Use PDF or DOCX.")

        # Defensive cleaning: remove hyphenation, normalize whitespace, optional PII redaction (False)
        cleaned = clean_text(content, redact=False)

        # In case cleaning removed everything, keep a friendly message
        if not cleaned or len(cleaned.strip()) < 20:
            parsing_status = "failed"
        else:
            parsing_status = "parsed"

        return {"filename": file.filename, "content": cleaned, "parsing_status": parsing_status}

    except Exception as e:
        # Log server-side and surface an error to the caller
        print(f"Error parsing resume: {e}")
        raise HTTPException(status_code=500, detail=f"Parsing error: {str(e)}")

# --- ENDPOINT 2: Scrape Job Description from URL ---
@router.post("/extract-job-desc")
async def extract_job_desc(request: ScrapeRequest):
    text = extract_job_text(request.url)
    if not text:
        return {
            "status": "partial_success",
            "message": "Could not auto-scrape. Please paste text manually.",
            "data": ""
        }
    return {"status": "success", "data": text}

# --- ENDPOINT 3: Generate Resume with AI ---
@router.post("/generate")
async def generate_resume_content(request: GenerateRequest):
    try:
        result = LLMEngine.generate_resume(
            request.profile,
            request.job_description,
            request.template_style
        )
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- ENDPOINT 4: Save User Profile ---
@router.post("/profile")
def save_user_profile(profile: UserProfile):
    """
    Saves user profile data (Currently just prints to console/logs).
    """
    print("Received User Profile:", profile.model_dump())
    return {"message": "Profile saved successfully!", "data": profile}

# --- ENDPOINT 5: ATS Score Checker (v1, legacy) ---
@router.post("/ats-score")
async def check_ats_score(request: AtsRequest):
    try:
        if not request.resume_text or not request.jd_text:
            raise HTTPException(status_code=400, detail="Both Resume and Job Description are required.")

        report = get_ats_report(request.resume_text, request.jd_text)
        return {"status": "success", "data": report}
    except Exception as e:
        print(f"ATS Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to calculate ATS score.")

# --- ENDPOINT 6: ATS Score Checker (v2) ---
@router.post("/ats-score-v2")
async def check_ats_score_v2(request: AtsV2Request):
    """
    New v2 endpoint that calls the advanced ATS orchestrator.
    It accepts either:
      - resume_text (string) AND jd_text (string), or
      - if resume_text omitted, caller can provide a previously parsed resume 'content' (same param)
    The endpoint returns the full v2 report (scores, insights, raw module outputs).
    """
    try:
        if not request.jd_text or (not request.resume_text or not request.resume_text.strip()):
            raise HTTPException(status_code=400, detail="Both resume_text and jd_text are required for v2 scoring.")

        # Clean inputs defensively
        resume_text = clean_text(request.resume_text, redact=False)
        jd_text = clean_text(request.jd_text, redact=False)

        report = run_ats_v2(resume_text, jd_text)
        return {"status": "success", "data": report}
    except HTTPException:
        raise
    except Exception as e:
        # FIX: Removed 'exc_info=True'
        print(f"ATS-v2 Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to calculate ATS v2 score.")