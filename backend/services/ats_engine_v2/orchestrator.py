# backend/services/ats_engine_v2/orchestrator.py
"""
Improved ATS v2 Orchestrator (patched to generate human-friendly insights)

Key additions in this patch:
- Adds deterministic human-readable 'good_points' and 'issues' under insights.
- These are templated sentences derived from module outputs:
    * Keyword coverage counts (required / preferred / bonus)
    * Semantic matches / missing requirements counts
    * Structure examples / problems
    * Readability / tone short notes
- If the existing generate_insights() returns content, we merge the deterministic phrases
  (giving precedence to explicit phrases returned by generate_insights).
- Backward compatible: other parts of the response unchanged.
"""

from typing import Dict, Any, List
from .ats_config import ATS_CONFIG
from .structure_analyzer import analyze_structure
from .keyword_engine import analyze_keywords
from .semantic_engine import compute_semantic_similarity
from .readability import analyze_readability
from .tone_analyzer import analyze_tone
from .role_detector import detect_role
from .insights import generate_insights


_DEFAULT_WEIGHTS = {
    "structure": 0.18,
    "keywords": 0.30,
    "semantics": 0.22,
    "readability": 0.15,
    "tone": 0.15
}


def _safe_call(func, *args, name: str = "module", default=None, **kwargs):
    """
    Helper to call module functions defensively.
    Returns default on exception (and logs server-side).
    """
    try:
        return func(*args, **kwargs)
    except Exception as e:
        print(f"[ATS v2] {name} error:", e)
        return default if default is not None else {}


def _human_join(xs: List[str], limit: int = 6) -> str:
    """Join list into short human-friendly string, cap items to `limit`."""
    if not xs:
        return ""
    xs2 = xs[:limit]
    if len(xs2) == 1:
        return xs2[0]
    if len(xs2) == 2:
        return f"{xs2[0]} and {xs2[1]}"
    return ", ".join(xs2[:-1]) + f", and {xs2[-1]}"


def _short_list_for_display(xs, max_items=6):
    return [str(x).strip() for x in (xs or [])][:max_items]


def build_human_insights(structure_result, keyword_result, semantic_result, readability_result, tone_result, role_result, total_score):
    """
    Build two lists:
      - good_points: positive short sentences
      - issues: short problem sentences
    Uses available outputs from module results with safe fallbacks.
    """
    good_points = []
    issues = []

    # --- Keywords: counts and examples ---
    try:
        kw_break = keyword_result.get("breakdown", {}) if isinstance(keyword_result, dict) else {}
        # For each tier gather present & missing (some engines use 'present' or 'found' etc)
        def _collect_tier(tier):
            block = kw_break.get(tier, {}) if isinstance(kw_break, dict) else {}
            present = block.get("present") or block.get("found") or block.get("matched") or []
            missing = block.get("missing") or []
            # normalize items to str
            pres = [ (p.get("phrase") if isinstance(p, dict) else p) for p in (present or []) ]
            miss = [ (m.get("phrase") if isinstance(m, dict) else m) for m in (missing or []) ]
            pres = [str(x).strip() for x in pres if x]
            miss = [str(x).strip() for x in miss if x]
            return pres, miss

        req_present, req_missing = _collect_tier("required")
        pref_present, pref_missing = _collect_tier("preferred")
        bonus_present, bonus_missing = _collect_tier("bonus")

        # counts
        req_total = len(req_present) + len(req_missing)
        pref_total = len(pref_present) + len(pref_missing)
        bonus_total = len(bonus_present) + len(bonus_missing)

        # Good points
        if req_present:
            sample = _short_list_for_display(req_present, 6)
            good_points.append(f"Matches {len(req_present)}/{req_total} required skills ({_human_join(sample)}).")
        elif req_total > 0:
            issues.append(f"Missing required skills: {_human_join(_short_list_for_display(req_missing, 6))}.")

        if pref_present:
            sample = _short_list_for_display(pref_present, 6)
            good_points.append(f"Includes preferred keywords ({_human_join(sample)}).")
        if bonus_present:
            sample = _short_list_for_display(bonus_present, 6)
            good_points.append(f"Also includes bonus keywords ({_human_join(sample)}).")

        if pref_missing and not req_present:
            # if preferred missing but required few, mention as secondary issue
            issues.append(f"Some preferred skills missing: {_human_join(_short_list_for_display(pref_missing, 6))}.")

    except Exception as e:
        print("[ATS v2] keyword-insight error:", e)

    # --- Semantics: matches / missing requirements ---
    try:
        sem_score = semantic_result.get("semantic_score") if isinstance(semantic_result, dict) else None
        high_matches = semantic_result.get("high_matches", []) if isinstance(semantic_result, dict) else []
        weak_matches = semantic_result.get("weak_matches", []) if isinstance(semantic_result, dict) else []
        missing_reqs = semantic_result.get("missing_requirements", []) if isinstance(semantic_result, dict) else []

        # semantic positives
        if high_matches and len(high_matches) > 0:
            good_points.append(f"{len(high_matches)} strong contextual match(es) to JD requirements.")
        if weak_matches and len(weak_matches) > 0:
            good_points.append(f"{len(weak_matches)} partial contextual match(es) — may need clearer wording.")

        # semantic issues
        if missing_reqs and len(missing_reqs) > 0:
            # show up to 4 missing req samples
            sample = _short_list_for_display(missing_reqs, 4)
            issues.append(f"Semantic gaps: {len(missing_reqs)} JD requirement(s) not reflected (e.g., {_human_join(sample)}).")

        # overall semantic score note
        if sem_score is not None:
            if sem_score >= 75:
                good_points.append(f"High semantic relevance (score: {int(sem_score)}).")
            elif sem_score >= 50:
                good_points.append(f"Moderate semantic relevance (score: {int(sem_score)}).")
            else:
                issues.append(f"Low semantic relevance (score: {int(sem_score)}). Consider adding role-specific achievements.")
    except Exception as e:
        print("[ATS v2] semantic-insight error:", e)

    # --- Structure ---
    try:
        # If analyzer exposes example and problems
        struct_example = structure_result.get("example") if isinstance(structure_result, dict) else None
        struct_score = structure_result.get("structure_score") if isinstance(structure_result, dict) else None
        struct_problems = structure_result.get("problems") or structure_result.get("issues") or []

        if struct_example:
            good_points.append("Resume has readable structure and clear sections.")
        if struct_score is not None:
            if struct_score >= 70:
                good_points.append(f"Structure looks solid (structure score: {int(struct_score)}).")
            elif struct_score < 50:
                issues.append(f"Structure may need work (structure score: {int(struct_score)}).")

        if struct_problems and len(struct_problems) > 0:
            sample = _short_list_for_display(struct_problems, 3)
            issues.append(f"Structure issues: {_human_join(sample)}.")
    except Exception as e:
        print("[ATS v2] structure-insight error:", e)

    # --- Readability & Tone ---
    try:
        read_score = readability_result.get("readability_score") if isinstance(readability_result, dict) else None
        tone_score = tone_result.get("tone_score") if isinstance(tone_result, dict) else None
        tone_notes = tone_result.get("notes") or tone_result.get("issues") or tone_result.get("positives") or []

        if read_score is not None:
            if read_score >= 70:
                good_points.append(f"Good readability (score: {int(read_score)}).")
            elif read_score < 50:
                issues.append(f"Readability could be improved (score: {int(read_score)}).")

        if tone_score is not None:
            if tone_score >= 65:
                good_points.append(f"Tone is impactful (tone score: {int(tone_score)}).")
            else:
                issues.append(f"Tone could be stronger (tone score: {int(tone_score)}). Use action verbs and metrics.")

        # include a small number of tone notes if present
        if tone_notes:
            tn = _short_list_for_display(tone_notes, 3)
            # if positive notes present -> good point else issue
            good_points.append(f"Tone notes: {_human_join(tn)}.") if tn else None
    except Exception as e:
        print("[ATS v2] tone-insight error:", e)

    # --- Role detection ---
    try:
        role_name = role_result.get("role") if isinstance(role_result, dict) else None
        role_conf = role_result.get("confidence") if isinstance(role_result, dict) else None
        if role_name:
            if role_conf is not None:
                good_points.append(f"Detected role: {role_name} ({int(role_conf * 100)}% confidence).")
            else:
                good_points.append(f"Detected role: {role_name}.")
    except Exception as e:
        print("[ATS v2] role-insight error:", e)

    # --- Overall guidance based on final score ---
    try:
        if total_score is not None:
            if total_score >= 75:
                good_points.append("Overall alignment is strong — resume appears well-matched to this JD.")
            elif total_score >= 50:
                good_points.append("Overall alignment is moderate — a few targeted changes could improve ATS match.")
            else:
                issues.append("Overall alignment is low — refocus bullets to highlight achievements and required skills.")
    except Exception:
        pass

    # Deduplicate keeping order and limit length
    def _dedupe(xs):
        seen = set()
        out = []
        for s in xs:
            t = (s or "").strip()
            if not t or t in seen:
                continue
            seen.add(t)
            out.append(t)
        return out

    return {"good_points": _dedupe(good_points)[:12], "issues": _dedupe(issues)[:12]}


def run_ats_v2(resume_text: str, jd_text: str) -> Dict[str, Any]:
    """
    Main entrypoint for ATS v2.

    Returns improved schema:
    {
      "meta": {...},
      "total_score": int,
      "breakdown": breakdown dict,
      "role": {...},
      "insights": {...},            # <- now includes human-friendly good_points & issues
      "raw": raw_out
    }
    """

    cfg = ATS_CONFIG or {}
    enable_structure   = cfg.get("enable_structure", True)
    enable_keywords    = cfg.get("enable_keywords", True)
    enable_semantics   = cfg.get("enable_semantics", True)
    enable_readability = cfg.get("enable_readability", True)
    enable_tone        = cfg.get("enable_tone", True)
    enable_role        = cfg.get("enable_role_detection", True)
    enable_insights    = cfg.get("enable_insights", True)

    export_raw = cfg.get("export_raw", False)
    weights = cfg.get("weights", _DEFAULT_WEIGHTS)

    # -------------------------
    # Execute ATS modules (defensively)
    # -------------------------
    structure_result = (
        _safe_call(analyze_structure, resume_text, name="structure_analyzer", default={})
        if enable_structure else {}
    )

    # IMPORTANT: analyze_keywords signature is (jd_text, resume_text)
    keyword_result = (
        _safe_call(analyze_keywords, jd_text, resume_text, name="keyword_engine", default={})
        if enable_keywords else {}
    )

    semantic_result = (
        _safe_call(compute_semantic_similarity, resume_text, jd_text, name="semantic_engine", default={})
        if enable_semantics else {}
    )

    readability_result = (
        _safe_call(analyze_readability, resume_text, name="readability", default={})
        if enable_readability else {}
    )

    tone_result = (
        _safe_call(analyze_tone, resume_text, name="tone_analyzer", default={})
        if enable_tone else {}
    )

    role_result = (
        _safe_call(detect_role, resume_text, name="role_detector", default={})
        if enable_role else {}
    )

    # -------------------------
    # Normalize numeric scores (safe)
    # -------------------------
    def safe_num(value):
        try:
            return float(value)
        except Exception:
            return 0.0

    struct_s = safe_num(structure_result.get("structure_score", structure_result.get("score", 0)))
    key_s    = safe_num(keyword_result.get("total_keyword_score", keyword_result.get("keyword_score", 0)))
    sem_s    = safe_num(semantic_result.get("semantic_score", semantic_result.get("score", 0)))
    read_s   = safe_num(readability_result.get("readability_score", readability_result.get("score", 0)))
    tone_s   = safe_num(tone_result.get("tone_score", tone_result.get("score", 0)))

    # -------------------------
    # Weighted final score
    # -------------------------
    w_structure   = weights.get("structure",   _DEFAULT_WEIGHTS["structure"])
    w_keywords    = weights.get("keywords",    _DEFAULT_WEIGHTS["keywords"])
    w_semantics   = weights.get("semantics",   _DEFAULT_WEIGHTS["semantics"])
    w_readability = weights.get("readability", _DEFAULT_WEIGHTS["readability"])
    w_tone        = weights.get("tone",        _DEFAULT_WEIGHTS["tone"])

    total_w = w_structure + w_keywords + w_semantics + w_readability + w_tone
    if total_w <= 0:
        total_w = 1.0

    weighted_score = (
        struct_s * w_structure +
        key_s    * w_keywords +
        sem_s    * w_semantics +
        read_s   * w_readability +
        tone_s   * w_tone
    ) / total_w

    final_score = int(round(max(0, min(100, weighted_score))))

    # -------------------------
    # Insights (existing generator)
    # -------------------------
    insights_input = {
        "structure": structure_result,
        "keywords": keyword_result,
        "semantics": semantic_result,
        "readability": readability_result,
        "tone": tone_result,
        "role": role_result
    }

    insights = {}
    if enable_insights:
        insights = _safe_call(generate_insights, insights_input, name="generate_insights", default={}) or {}

    # -------------------------
    # Deterministic human-friendly insights (merge strategy)
    # -------------------------
    human_ins = build_human_insights(structure_result, keyword_result, semantic_result, readability_result, tone_result, role_result, final_score)

    # If generate_insights already provided good_points/issues, prefer them but merge otherwise
    merged_good = []
    merged_issues = []

    gen_good = insights.get("good_points") or insights.get("positives") or []
    gen_issues = insights.get("issues") or insights.get("problems") or []

    # normalize to lists of strings
    def _to_strings(x):
        if not x:
            return []
        if isinstance(x, list):
            return [str(i).strip() for i in x if str(i).strip()]
        return [str(x).strip()]

    gen_good_list = _to_strings(gen_good)
    gen_issues_list = _to_strings(gen_issues)
    human_good_list = _to_strings(human_ins.get("good_points", []))
    human_issues_list = _to_strings(human_ins.get("issues", []))

    # merge while preserving order and dedup
    def _merge_lists(primary, secondary, limit=12):
        seen = set()
        out = []
        for s in (primary or []):
            t = (s or "").strip()
            if t and t not in seen:
                seen.add(t)
                out.append(t)
                if len(out) >= limit:
                    return out
        for s in (secondary or []):
            t = (s or "").strip()
            if t and t not in seen:
                seen.add(t)
                out.append(t)
                if len(out) >= limit:
                    return out
        return out

    # prefer generated (LLM or custom) good_points if present, else use human_ins first
    merged_good = _merge_lists(gen_good_list, human_good_list, limit=12) if gen_good_list else human_good_list[:12]
    merged_issues = _merge_lists(gen_issues_list, human_issues_list, limit=12) if gen_issues_list else human_issues_list[:12]

    # attach merged to insights (without removing existing insights keys)
    insights["good_points"] = merged_good
    insights["issues"] = merged_issues

    # -------------------------
    # Construct improved breakdown
    # -------------------------
    breakdown = {
        "structure":   {"score": int(round(struct_s)), "weight": float(w_structure)},
        "keywords":    {"score": int(round(key_s)),    "weight": float(w_keywords)},
        "semantics":   {"score": int(round(sem_s)),    "weight": float(w_semantics)},
        "readability": {"score": int(round(read_s)),   "weight": float(w_readability)},
        "tone":        {"score": int(round(tone_s)),   "weight": float(w_tone)}
    }

    # -------------------------
    # Raw: always include mandatory keyword keys (canonical shape)
    # -------------------------
    raw_keywords = {
        "total_keyword_score": keyword_result.get("total_keyword_score", keyword_result.get("keyword_score", 0)),
        "breakdown":           keyword_result.get("breakdown", {}),
        "raw_counts":          keyword_result.get("raw_counts", {}),
        "tiers_detected":      keyword_result.get("tiers_detected", {})
    }

    # Build raw output (compact vs full)
    raw_out_compact = {
        "keywords": raw_keywords,
        "structure": {"structure_score": structure_result.get("structure_score", None)} if structure_result else {},
        "semantics": {"semantic_score": semantic_result.get("semantic_score", None)} if semantic_result else {},
        "readability": {"readability_score": readability_result.get("readability_score", None)} if readability_result else {},
        "tone": {"tone_score": tone_result.get("tone_score", None)} if tone_result else {},
        "role": role_result or {}
    }

    if export_raw:
        # Return full module outputs but truncate obvious large fields
        def _truncate_large_texts(obj):
            if isinstance(obj, dict):
                for k, v in list(obj.items()):
                    if k.lower() in ("content", "text", "resume_text", "jd_text"):
                        if isinstance(v, str) and len(v) > 2000:
                            obj[k] = v[:2000] + "...[truncated]"
                    elif isinstance(v, dict):
                        _truncate_large_texts(v)
                return obj
            return obj
        full_raw = {
            "keywords": raw_keywords,
            "structure": structure_result,
            "semantics": semantic_result,
            "readability": readability_result,
            "tone": tone_result,
            "role": role_result
        }
        _truncate_large_texts(full_raw)
        raw_out = full_raw
    else:
        raw_out = raw_out_compact

    # -------------------------
    # Final response structure (improved schema)
    # -------------------------
    response: Dict[str, Any] = {
        "meta": {"ats_v": "2.0", "export_raw": bool(export_raw)},
        "total_score": final_score,
        "breakdown": breakdown,
        "role": role_result,
        "insights": insights,
        "raw": raw_out
    }

    return response
