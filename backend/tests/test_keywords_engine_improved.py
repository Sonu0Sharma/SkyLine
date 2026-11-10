# backend/tests/test_keywords_engine_improved.py
import pytest

# Import the keyword scoring function from your v2 package
from backend.services.ats_engine_v2.keyword_engine import score_keywords

def test_keyword_tier_detection_and_scoring():
    jd_text = (
        "We are hiring a Senior Web Developer.\n\n"
        "MUST HAVE:\n"
        "- JavaScript\n"
        "- HTML\n"
        "- CSS\n"
        "- React.js\n"
        "- Node.js\n\n"
        "NICE TO HAVE:\n"
        "- Angular.js\n"
        "- AWS"
    )

    resume_text = (
        "Jackson MacArthur\n"
        "Web Developer\n"
        "SKILLS: JavaScript, HTML, CSS, React.js, Node.js, AWS\n"
        "EXPERIENCE: Built web apps using React and Node.js"
    )

    # score_keywords returns the improved structure with 'total_keyword_score'
    result = score_keywords(jd_text, resume_text)

    assert isinstance(result, dict), "score_keywords should return a dict"
    # Required: 'total_keyword_score' present and in 0..100
    assert "total_keyword_score" in result
    assert 0 <= result["total_keyword_score"] <= 100

    # breakdown format must exist
    bd = result.get("breakdown", {})
    assert "required" in bd and "preferred" in bd and "bonus" in bd

    # Ensure commonly required tokens mapped properly
    tiers = result.get("tiers_detected", {})
    req = tiers.get("required", [])
    # lowercase compare for safety
    req_lower = [p.lower() for p in req]
    for expected in ("javascript", "html", "css", "react.js", "node.js"):
        assert expected in req_lower, f"Expected '{expected}' in detected required tier"

    # Check matched required count is >= 3 (resume contains many)
    matched_required = bd["required"].get("matched", [])
    assert len(matched_required) >= 3

    # Raw counts must include entries for core tokens
    raw = result.get("raw_counts", {})
    found = any(k for k in raw.keys() if "javascript" in k or "react" in k)
    assert found, "raw_counts should include core tokens like javascript or react"
