"""
Structure Analyzer for ATS v2
-----------------------------

Detects resume structural elements and formatting quality. Returns a normalized
score (0-100) and a list of human-readable findings that can be shown in UI.

Responsibilities:
- Detect presence of key sections: Contact, Summary, Skills, Experience, Education, Projects/Certs
- Evaluate bullet vs paragraph usage in Experience
- Detect contact info presence (email/phone)
- Flag risky items for ATS parsing (images, tables, extraneous headers)
- Detect possible large date/gap anomalies (heuristic)
- Produce `structure_score` and `structure_findings`

This module is intentionally rule-based and conservative; it is meant to be
interpretable and robust across many resume styles.
"""

import re
from typing import Dict, List, Tuple

# Optional: use spaCy if available for better heading detection (not required)
try:
    import spacy
    nlp = spacy.load("en_core_web_sm")
except Exception:
    nlp = None

# Simple regexes
_EMAIL_RE = re.compile(r'[\w\.-]+@[\w\.-]+\.\w+', flags=re.IGNORECASE)
_PHONE_RE = re.compile(r'(\+?\d{1,3}[\s\-\.])?(?:\(?\d{2,4}\)?[\s\-\.]?)?\d{3,4}[\s\-\.]?\d{3,4}')
_YEAR_RE = re.compile(r'\b(19|20)\d{2}\b')
_PAGE_ARTIFACT_RE = re.compile(r'page\s*\d+\s*(of\s*\d+)?', flags=re.IGNORECASE)
_IMAGE_TAG_RE = re.compile(r'\.(jpg|jpeg|png|gif|svg)\b', flags=re.IGNORECASE)


def _find_headings_by_lines(text: str) -> List[str]:
    """
    Heuristic: lines that are short (<= 40 chars), uppercase-first-word or end with colon
    are likely headings. Return normalized heading tokens.
    """
    headings = []
    for line in text.splitlines():
        s = line.strip()
        if not s:
            continue
        # Candidate heading heuristics
        if len(s) <= 40 and (s.endswith(':') or s.isupper() or s[0].isupper()):
            # normalize: remove trailing colon and punctuation
            norm = re.sub(r'[:\-\s]+$', '', s).strip()
            # Lowercase and remove punctuation for matching
            norm_token = re.sub(r'[^\w\s]', '', norm).lower()
            if len(norm_token) > 1:
                headings.append(norm_token)
    return list(dict.fromkeys(headings))  # preserve order, unique


def _has_contact_info(text: str) -> Tuple[bool, List[str]]:
    found = []
    if _EMAIL_RE.search(text):
        found.append("email")
    if _PHONE_RE.search(text):
        found.append("phone")
    # Optionally detect location or LinkedIn pattern
    if "linkedin.com" in text.lower():
        found.append("linkedin")
    return (len(found) > 0, found)


def _count_bullets_and_paragraphs(text: str) -> Tuple[int, int]:
    """
    Returns (bullets, paragraphs)
    Bullets are lines that start with typical bullet markers (-, *, •) or numbering.
    Paragraphs are the count of non-empty line groups separated by blank lines.
    """
    bullets = 0
    paragraphs = 0
    lines = [ln for ln in text.splitlines()]
    # bullets
    for ln in lines:
        if re.match(r'^\s*[-\*\u2022]\s+', ln) or re.match(r'^\s*\d+[\.\)]\s+', ln):
            bullets += 1
    # paragraphs (simple heuristic)
    paragraphs = len([p for p in re.split(r'\n\s*\n', text) if p.strip()])
    return bullets, paragraphs


def _detect_images_or_table_artifacts(text: str) -> List[str]:
    findings = []
    # If images or file extension references exist in text, flag them
    if _IMAGE_TAG_RE.search(text):
        findings.append("Possible embedded images detected (may break ATS parsing).")
    # page artifacts
    if _PAGE_ARTIFACT_RE.search(text):
        findings.append("Page footer/header artifacts detected.")
    # common table markers (pipes, many consecutive spaces, tab-like content)
    if '|' in text and text.count('|') > 3:
        findings.append("Table-like content detected (pipe characters).")
    if re.search(r'\t', text):
        findings.append("Tab characters detected (tables or pasted content).")
    return findings


def _detect_date_gaps(text: str) -> Tuple[bool, List[str]]:
    """
    Heuristic: find years and detect if there are large gaps between consecutive years mentioned.
    This is a weak heuristic but useful to raise a flag for manual review.
    """
    # FIX: Changed YEAR_RE to _YEAR_RE to match the variable defined above
    years = [int(m.group(0)) for m in _YEAR_RE.finditer(text)]
    years = sorted(set(years))
    findings = []
    if len(years) >= 2:
        # compute gaps (conservative)
        gaps = []
        for i in range(1, len(years)):
            delta = years[i] - years[i-1]
            if delta >= 4:
                gaps.append((years[i-1], years[i], delta))
        if gaps:
            for a, b, d in gaps:
                findings.append(f"Year gap detected between {a} and {b} ({d} years).")
            return True, findings
    return False, findings


def analyze_structure(text: str) -> Dict:
    """
    Main entrypoint.

    Returns:
      {
        "structure_score": int,   # 0-100
        "structure_findings": [str, ...],
        "sections_found": { "skills": bool, "experience": bool, ... },
        "bullets": int,
        "paragraphs": int
      }
    """
    if not text:
        return {
            "structure_score": 0,
            "structure_findings": ["No content provided."],
            "sections_found": {},
            "bullets": 0,
            "paragraphs": 0
        }

    findings: List[str] = []
    sections_found = {
        "contact": False,
        "summary": False,
        "skills": False,
        "experience": False,
        "education": False,
        "projects": False,
        "certifications": False
    }

    # 1) Contact info
    has_contact, contact_items = _has_contact_info(text)
    sections_found["contact"] = has_contact
    if not has_contact:
        findings.append("Contact info (email/phone) not detected near top of resume.")

    # 2) Headings detection
    headings = _find_headings_by_lines(text)
    # map common heading keywords to our sections
    for h in headings:
        if any(k in h for k in ["summary", "profile", "about", "overview"]):
            sections_found["summary"] = True
        if any(k in h for k in ["skill", "technical_skills", "skills"]):
            sections_found["skills"] = True
        if any(k in h for k in ["experience", "employment", "work"]):
            sections_found["experience"] = True
        if any(k in h for k in ["education", "academic", "degree", "qualification"]):
            sections_found["education"] = True
        if any(k in h for k in ["project", "projects"]):
            sections_found["projects"] = True
        if any(k in h for k in ["certif", "certificate", "certification"]):
            sections_found["certifications"] = True

    # 3) Fallback heuristics for skill lists (comma separated lines near top)
    top_chunk = '\n'.join(text.splitlines()[:20]).lower()
    if not sections_found["skills"]:
        # detect patterns like "skills: html, css, javascript"
        if re.search(r'\bskills?\s*[:\-]\s*', top_chunk) or re.search(r'\b(html|css|javascript|python|react|sql)\b', top_chunk):
            sections_found["skills"] = True

    # 4) Bullets vs paragraphs
    bullets, paragraphs = _count_bullets_and_paragraphs(text)
    # penalize resumes that have zero bullets within experience-like areas
    if sections_found["experience"] and bullets < 3:
        findings.append("Experience section has few or no bullets; use bullets to improve ATS readability.")

    # 5) Detect image/table artifacts
    findings.extend(_detect_images_or_table_artifacts(text))

    # 6) Date gap heuristic
    gap_flag, gap_findings = _detect_date_gaps(text)
    if gap_flag:
        findings.extend(gap_findings)

    # 7) Section presence scoring
    # Basic scoring: each critical section contributes points
    score = 0.0
    total_possible = 0.0

    # Assign points
    critical_sections = ["contact", "skills", "experience", "education"]
    optional_sections = ["summary", "projects", "certifications"]

    # Critical sections (higher weight)
    for sec in critical_sections:
        total_possible += 1.5
        if sections_found.get(sec):
            score += 1.5
        else:
            findings.append(f"Missing or unclear section: {sec.capitalize()}.")

    # Optional sections (lower weight)
    for sec in optional_sections:
        total_possible += 1.0
        if sections_found.get(sec):
            score += 1.0

    # Formatting quality: bullets vs paragraphs bonus
    total_possible += 1.0
    if bullets >= max(3, int(paragraphs * 0.5)):
        score += 1.0
    else:
        findings.append("Consider using more concise bullet points in Experience for readability.")

    # ATS risky artifacts penalty (deduct up to 1.5 points)
    total_possible += 1.5
    artifact_penalty = 0.0
    if any("image" in f.lower() for f in findings):
        artifact_penalty += 0.8
    if any("table" in f.lower() for f in findings):
        artifact_penalty += 0.7
    # subtract penalty
    score -= artifact_penalty

    # Normalize to 0-100
    raw_fraction = max(0.0, min(1.0, score / max(0.01, total_possible)))
    structure_score = int(round(raw_fraction * 100))

    # Tidy unique findings
    unique_findings = []
    for f in findings:
        if f not in unique_findings:
            unique_findings.append(f)

    return {
        "structure_score": structure_score,
        "structure_findings": unique_findings,
        "sections_found": sections_found,
        "bullets": bullets,
        "paragraphs": paragraphs
    }