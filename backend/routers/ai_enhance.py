# backend/routers/ai_enhance.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List
import json
import re

from backend.services.llm_engine import LLMEngine

# Primary router (current production route)
router = APIRouter(prefix="/api/ai", tags=["AI Enhancement"])

# Alias router (backwards compatibility)
alias_router = APIRouter(prefix="/ai", tags=["AI Enhancement - Legacy Alias"])


class EnhanceRequest(BaseModel):
    report: Dict[str, Any]


def extract_missing_phrases(report: dict):
    try:
        raw_kw = report.get("raw", {}).get("keywords", {}).get("breakdown", {})
        if not raw_kw:
            return []
        phrases = []
        for tier in ("required", "preferred", "bonus"):
            block = raw_kw.get(tier, {})
            missing_list = block.get("missing", [])
            for item in missing_list:
                if isinstance(item, dict) and item.get("phrase"):
                    phrases.append(item["phrase"])
                elif isinstance(item, str):
                    phrases.append(item)
        return phrases[:10]
    except Exception:
        return []


def build_prompt(report: dict) -> str:
    compact = {
        "total_score": report.get("total_score"),
        "breakdown": report.get("breakdown"),
        "quick_wins": report.get("insights", {}).get("quick_wins", []),
        "overall_summary": report.get("insights", {}).get("overall_summary", ""),
        "role": report.get("role", {}),
        "top_missing_keywords": extract_missing_phrases(report),
    }

    schema_instruction = """
You are an elite Resume & ATS Expert.

Given the ATS analysis JSON, rewrite the quick wins into PREMIUM, CLEAR, ACTIONABLE suggestions.

⚠️ Output MUST be VALID JSON ONLY.
⚠️ NO markdown, NO comments, NO text outside JSON.

Return an array of objects in this EXACT schema:

[
  {
    "id": "short_snake_case_id",
    "title": "6 words max",
    "priority": "High" | "Medium" | "Low",
    "estimated_minutes": 5,
    "reason": "1 sentence explaining why this matters.",
    "recommendation": "1–2 sentences of actionable changes.",
    "before": "optional short snippet",
    "after": "optional improved rewrite"
  }
]

RULES:
- Make changes SPECIFIC to the resume & JD.
- Provide before/after only when relevant.
- Keep everything concise, sharp and helpful.
- DO NOT invent fake technologies or roles.
- Avoid generic advice — customize based on the ATS data.
"""

    return f"{schema_instruction}\n\nATS_JSON:\n{json.dumps(compact, indent=2, ensure_ascii=False)}"


# ---------- Robust JSON extraction helpers ----------
def _try_json_load(raw: str):
    try:
        return json.loads(raw)
    except Exception:
        return None


def _extract_json_objects(raw: str) -> List[Any]:
    """
    Attempt to find JSON objects/arrays inside `raw`.
    Strategy:
      1) Try json.loads(raw)
      2) Otherwise scan for top-level {...} and [...] substrings by counting braces/brackets,
         attempt json.loads on each candidate substring.
      3) Return list of successfully parsed objects (could be one dict or a list).
    """
    objs = []

    # 1) direct load
    parsed = _try_json_load(raw)
    if parsed is not None:
        # normalize to list
        if isinstance(parsed, list):
            return parsed
        return [parsed]

    # 2) scan for {...} and [...]
    # find indices of '{' and '[' then try to balance
    for i, ch in enumerate(raw):
        if ch not in '{[':
            continue
        opening = ch
        closing = '}' if ch == '{' else ']'
        depth = 0
        for j in range(i, len(raw)):
            if raw[j] == opening:
                depth += 1
            elif raw[j] == closing:
                depth -= 1
                if depth == 0:
                    candidate = raw[i:j+1]
                    try:
                        parsed = json.loads(candidate)
                        objs.append(parsed)
                    except Exception:
                        # try to be forgiving: strip trailing commas, etc.
                        cand2 = re.sub(r',\s*([\]}])', r'\1', candidate)
                        try:
                            parsed = json.loads(cand2)
                            objs.append(parsed)
                        except Exception:
                            pass
                    break
    return objs


def _normalize_item_keys(item: Dict) -> Dict:
    """
    Lowercase keys (to handle inconsistent LLM casing) and keep values as-is.
    """
    normalized = {}
    for k, v in item.items():
        nk = k.lower() if isinstance(k, str) else k
        normalized[nk] = v
    return normalized


def _fill_before_from_report(item: Dict, report: Dict) -> Dict:
    """
    If 'before' is missing/empty, attempt to fill from ATS raw modules:
      - raw.semantics.example_snippet
      - raw.keywords.breakdown -> try to find 'missing' text
      - raw.structure.example (if exists)
    """
    if item.get("before"):
        return item

    raw = report.get("raw", {}) if report else {}
    # semantics example_snippet
    sem = raw.get("semantics", {}) or {}
    kw = raw.get("keywords", {}) or {}
    struct = raw.get("structure", {}) or {}

    candidates = []
    # semantics example
    if sem.get("example_snippet"):
        candidates.append(sem.get("example_snippet"))
    # keywords: breakdown missing phrases (best-effort)
    try:
        kb = kw.get("breakdown", {}) or {}
        # search for "missing" lists inside breakdown tiers
        for tier in ("required", "preferred", "bonus"):
            block = kb.get(tier, {}) or {}
            missing = block.get("missing") or []
            if isinstance(missing, list) and missing:
                # pick first string form
                for m in missing:
                    if isinstance(m, str):
                        candidates.append(m)
                        break
                    elif isinstance(m, dict) and m.get("phrase"):
                        candidates.append(m.get("phrase"))
                        break
    except Exception:
        pass
    # structure example
    if struct.get("example"):
        candidates.append(struct.get("example"))

    # pick first candidate
    for c in candidates:
        if c:
            item["before"] = c
            return item

    # fallback: leave as null / empty string
    item["before"] = item.get("before")  # keep as-is (None or "")
    return item


def _coerce_to_enhanced_list(parsed_any, report: Dict) -> List[Dict]:
    """
    Ensure the output is a list of dicts with lowercased keys and filled 'before' where possible.
    """
    out = []
    if parsed_any is None:
        return out

    if isinstance(parsed_any, dict):
        candidates = [parsed_any]
    elif isinstance(parsed_any, list):
        candidates = parsed_any
    else:
        return out

    for cand in candidates:
        if not isinstance(cand, dict):
            continue
        norm = _normalize_item_keys(cand)
        # ensure keys exist
        norm.setdefault("id", None)
        norm.setdefault("title", None)
        norm.setdefault("priority", None)
        norm.setdefault("estimated_minutes", None)
        norm.setdefault("reason", None)
        norm.setdefault("recommendation", None)
        norm.setdefault("before", None)
        norm.setdefault("after", None)

        # fill before if missing using ATS raw
        norm = _fill_before_from_report(norm, report)
        out.append(norm)
    return out


def _perform_enhancement(report: dict):
    """
    Core logic: call the LLM and return parsed JSON or fallback to raw quick_wins.
    Robust parsing and key-normalization added.
    """
    prompt = build_prompt(report)
    try:
        raw_output = LLMEngine.generate_response(
            prompt,
            task_type="ats_enhance",
            role="ATS_Analyst"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM Engine failure: {str(e)}")

    if not raw_output:
        # fallback to quick_wins raw
        fallback = report.get("insights", {}).get("quick_wins", [])
        return {
            "status": "partial",
            "message": "LLM returned empty response. Returning raw quick wins transformed.",
            "enhanced": fallback,
            "raw_output": ""
        }

    # strip typical markdown fences (but keep raw_output for debugging)
    cleaned = raw_output.replace("```json", "").replace("```", "").strip()

    # Attempt direct load
    parsed = _try_json_load(cleaned)
    enhanced = []
    if parsed is not None:
        enhanced = _coerce_to_enhanced_list(parsed, report)
    else:
        # attempt to extract multiple JSON objects from the raw text
        objs = _extract_json_objects(cleaned)
        if objs:
            # If there are multiple results (e.g. several dicts), combine them
            combined = []
            for o in objs:
                if isinstance(o, list):
                    combined.extend(o)
                elif isinstance(o, dict):
                    combined.append(o)
            enhanced = _coerce_to_enhanced_list(combined, report)

    if not enhanced:
        # Last fallback: transform raw quick wins into minimal shape
        fallback = report.get("insights", {}).get("quick_wins", []) or []
        transformed = []
        for idx, q in enumerate(fallback):
            transformed.append({
                "id": f"fallback_{idx+1}",
                "title": q if isinstance(q, str) else (q.get("title") if isinstance(q, dict) else "Quick Win"),
                "priority": "Medium",
                "estimated_minutes": None,
                "reason": q if isinstance(q, str) else (q.get("reason") if isinstance(q, dict) else ""),
                "recommendation": q.get("recommendation", "") if isinstance(q, dict) else "",
                "before": None,
                "after": None
            })
        return {
            "status": "partial",
            "message": "Could not parse LLM JSON. Returning raw quick wins transformed.",
            "enhanced": transformed,
            "raw_output": cleaned
        }

    return {"status": "success", "enhanced": enhanced, "raw_output": cleaned}


@router.post("/enhance-ats")
def enhance_ats(req: EnhanceRequest):
    report = req.report
    if not report:
        raise HTTPException(status_code=400, detail="Missing ATS report.")
    return _perform_enhancement(report)


# Alias route for backwards compatibility: /ai/enhance-ats
@alias_router.post("/enhance-ats")
def enhance_ats_alias(req: EnhanceRequest):
    report = req.report
    if not report:
        raise HTTPException(status_code=400, detail="Missing ATS report.")
    return _perform_enhancement(report)
