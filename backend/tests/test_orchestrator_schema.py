# backend/tests/test_orchestrator_schema.py
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.ats_engine_v2.orchestrator import run_ats_v2

client = TestClient(app)

def build_sample_inputs():
    resume_text = (
        "JACKSON MACARTHUR\n"
        "Web Developer\n"
        "SKILLS: JavaScript, HTML, CSS, React.js, Node.js, AWS\n"
        "EXPERIENCE: Web Developer at Squarespace\n"
        "Delivered responsive UI components using React and CSS."
    )

    jd_text = (
        "Senior Web Developer\n\n"
        "MUST HAVE:\n- JavaScript\n- HTML\n- CSS\n- React.js\n- Node.js\n\n"
        "NICE TO HAVE:\n- Angular.js\n- AWS"
    )
    return resume_text, jd_text

def test_orchestrator_returns_improved_schema():
    resume_text, jd_text = build_sample_inputs()
    report = run_ats_v2(resume_text, jd_text)

    # Top-level keys
    assert "total_score" in report
    assert "breakdown" in report
    assert "insights" in report
    assert "role" in report
    assert "raw" in report

    # Breakdown keys & shape
    breakdown = report["breakdown"]
    for k in ("structure", "keywords", "semantics", "readability", "tone"):
        assert k in breakdown
        assert isinstance(breakdown[k], dict)
        assert "score" in breakdown[k] and "weight" in breakdown[k]
        # score numeric 0..100
        assert 0 <= breakdown[k]["score"] <= 100
        assert 0.0 <= breakdown[k]["weight"] <= 1.0

    # raw.keywords canonical fields present
    raw_kw = report["raw"].get("keywords", {})
    assert "total_keyword_score" in raw_kw
    assert "breakdown" in raw_kw
    assert "raw_counts" in raw_kw
    assert "tiers_detected" in raw_kw

    # final score is consistent: roughly a weighted sum (sanity check)
    calc = 0.0
    for k, v in breakdown.items():
        calc += v["score"] * v["weight"]
    assert abs(report["total_score"] - round(calc)) <= 5, "total_score should be weighted sum (within tolerance)"
