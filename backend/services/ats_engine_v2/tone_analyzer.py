"""
Tone & Impact Analyzer for ATS v2
---------------------------------

Purpose:
- Measure the resume's tone, leadership/ownership signals, and result-orientation.
- Provide a normalized tone_score (0-100) and explainable findings.
- Designed to be role-agnostic but exposes metrics useful for manager vs individual contributor roles.

Key signals:
- Action verb density (already measured in readability, but repeated here for independence)
- Leadership/ownership keywords (led, managed, owned, supervised, etc.)
- First-person conversational language usage (I, we) — small penalty if excessive
- Presence of quantifiers (%, numbers) — rewards impact
- Politeness/softening phrases (might, could, sometimes) — slight penalty for hedging

Output:
{
  "tone_score": int,
  "findings": [...],
  "stats": {
      "action_verb_ratio": float,
      "leadership_count": int,
      "first_person_ratio": float,
      "quantified_ratio": float,
      "hedging_ratio": float
  }
}
"""

import re
from typing import Dict, List
from .ats_config import ATS_CONFIG

# Expandable lists
ACTION_VERBS = set([
    "developed","created","designed","built","implemented","improved","optimized",
    "led","managed","launched","initiated","enhanced","engineered","resolved",
    "coordinated","executed","drove","modernized","streamlined","automated",
    "owned","mentored","supervised","directed","orchestrated","spearheaded"
])

LEADERSHIP_KEYWORDS = set(ATS_CONFIG.get("tone", {}).get("leadership_keywords", [
    "led", "managed", "supervised", "owned",
    "coordinated", "mentored", "directed"
]))

FIRST_PERSON_RE = re.compile(r'\b(i\s+|we\s+|i\'m\b|i am\b|we are\b|our team\b)', flags=re.IGNORECASE)
NUMBER_RE = re.compile(r'\d+')
HEDGING_RE = re.compile(r'\b(might|could|maybe|sometimes|possibly|may)\b', flags=re.IGNORECASE)

# Re-use a small action verb set for quick detection (lowercase)
_ACTION_VERBS_LOWER = {v.lower() for v in ACTION_VERBS}

def _split_sentences(text: str) -> List[str]:
    if not text:
        return []
    # Simple sentence split; conservative
    pieces = re.split(r'[\.!?]\s+', text)
    sentences = [s.strip() for s in pieces if len(s.strip()) > 2]
    return sentences

def _count_action_verbs_in_sent(sent: str) -> int:
    s = sent.lower()
    count = 0
    for v in _ACTION_VERBS_LOWER:
        # word boundary to avoid substrings
        if re.search(r'\b' + re.escape(v) + r'\b', s):
            count += 1
    return count

def _count_leadership_keywords(text: str) -> int:
    t = text.lower()
    c = 0
    for kw in LEADERSHIP_KEYWORDS:
        if re.search(r'\b' + re.escape(kw) + r'\b', t):
            c += 1
    return c

def analyze_tone(text: str) -> Dict:
    """
    Analyze tone and impact of the given text.

    Returns a dict with tone_score, findings, and stats.
    """
    if not text:
        return {
            "tone_score": 0,
            "findings": ["No text provided."],
            "stats": {}
        }

    cfg = ATS_CONFIG.get("tone", {})
    min_action_ratio = cfg.get("min_action_verb_ratio", 0.25)
    max_first_person = cfg.get("max_first_person_ratio", 0.12)

    sentences = _split_sentences(text)
    if not sentences:
        return {
            "tone_score": 0,
            "findings": ["Text too short for tone analysis."],
            "stats": {}
        }

    total_sent = len(sentences)
    action_verb_count = 0
    quantified_count = 0
    first_person_count = 0
    hedging_count = 0

    for s in sentences:
        action_verb_count += _count_action_verbs_in_sent(s)
        if NUMBER_RE.search(s):
            quantified_count += 1
        if FIRST_PERSON_RE.search(s):
            first_person_count += 1
        if HEDGING_RE.search(s):
            hedging_count += 1

    # Stats
    action_verb_ratio = action_verb_count / total_sent if total_sent else 0.0
    quantified_ratio = quantified_count / total_sent if total_sent else 0.0
    first_person_ratio = first_person_count / total_sent if total_sent else 0.0
    hedging_ratio = hedging_count / total_sent if total_sent else 0.0
    leadership_count = _count_leadership_keywords(text)

    # Compose a score with configurable weights (kept conservative)
    # Base components: action_verbs, quantified, leadership, penalty for first-person and hedging
    action_weight = 0.45
    quant_weight = 0.20
    leadership_weight = 0.20
    penalty_first_person = 0.10
    penalty_hedging = 0.05

    # Normalize each metric to [0..1] in simple ways
    # Action: cap at 1.0 (if ratio >= min_action_ratio => partial credit)
    action_norm = min(1.0, action_verb_ratio / max(1e-6, min_action_ratio))
    quant_norm = min(1.0, quantified_ratio / 0.25)  # if 25% sentences have numbers -> full credit
    leadership_norm = min(1.0, leadership_count / 3.0)  # 3 leadership mentions -> full
    first_person_pen = min(1.0, first_person_ratio / max(1e-6, max_first_person))
    hedging_pen = min(1.0, hedging_ratio / 0.10)  # if 10% hedging sentences -> full penalty

    raw_score = (
        action_weight * action_norm +
        quant_weight * quant_norm +
        leadership_weight * leadership_norm
    )
    # apply penalties
    raw_score -= penalty_first_person * first_person_pen
    raw_score -= penalty_hedging * hedging_pen

    # clamp and map to 0-100
    normalized = max(0.0, min(1.0, raw_score))
    tone_score = int(round(normalized * 100))

    findings: List[str] = []
    if action_verb_ratio < min_action_ratio:
        findings.append(f"Low action-verb density ({action_verb_ratio:.2f}). Start bullets with strong verbs.")
    if quantified_ratio < 0.15:
        findings.append("Few quantified achievements — add % or numbers to show impact.")
    if first_person_ratio > max_first_person:
        findings.append("Frequent first-person language detected — make statements more outcome-focused.")
    if hedging_ratio > 0.05:
        findings.append("Hedging language (might/could/possibly) detected — be confident and assertive.")
    if leadership_count > 0:
        findings.append(f"Leadership/ownership signals detected ({leadership_count}). Good for managerial roles.")

    stats = {
        "action_verb_ratio": round(action_verb_ratio, 3),
        "leadership_count": leadership_count,
        "first_person_ratio": round(first_person_ratio, 3),
        "quantified_ratio": round(quantified_ratio, 3),
        "hedging_ratio": round(hedging_ratio, 3)
    }

    return {
        "tone_score": tone_score,
        "findings": findings,
        "stats": stats
    }
