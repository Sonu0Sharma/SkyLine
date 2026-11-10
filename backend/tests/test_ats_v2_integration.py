# backend/tests/test_ats_v2_integration.py
import json
from pathlib import Path
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

# FIX: Point to the local file that exists in your project root
PDF_PATH = "resume.pdf"

def test_upload_and_ats_v2_full_flow():
    assert Path(PDF_PATH).exists(), f"Test data missing: {PDF_PATH}"

    # 1) Upload the PDF to the upload-resume endpoint
    with open(PDF_PATH, "rb") as f:
        # We send the file using the name "resume.pdf"
        files = {"file": ("resume.pdf", f, "application/pdf")}
        upload_resp = client.post("/resume/upload-resume", files=files)
    
    assert upload_resp.status_code == 200, f"Upload failed: {upload_resp.text}"
    upload_data = upload_resp.json()
    assert "content" in upload_data, "upload-resume must return cleaned 'content'"
    cleaned_content = upload_data["content"]
    assert isinstance(cleaned_content, str) and len(cleaned_content) > 20, "Parsed content too short; OCR may have failed"

    # 2) Call ATS v2 endpoint using cleaned content + sample JD
    jd_text = (
        "Senior Web Developer\n\n"
        "MUST HAVE:\n- JavaScript\n- HTML\n- CSS\n- React.js\n- Node.js\n\n"
        "NICE TO HAVE:\n- Angular.js\n- AWS"
    )
    payload = {
        "resume_text": cleaned_content,
        "jd_text": jd_text
    }
    ats_resp = client.post("/resume/ats-score-v2", json=payload)
    assert ats_resp.status_code == 200, f"ATS-v2 endpoint failed: {ats_resp.text}"
    data = ats_resp.json()
    assert "data" in data
    report = data["data"]

    # Validate improved schema shape
    # Note: Depending on your orchestrator version, ensure these keys exist
    # Checking for high-level keys returned by orchestrator.py
    assert "scores" in report or "total_score" in report
    assert "raw" in report
    
    if "raw" in report and "keywords" in report["raw"]:
        assert "total_keyword_score" in report["raw"]["keywords"]

    # Quick wins/insights check
    assert "insights" in report