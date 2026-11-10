"""
Readability Analyzer for ATS v2
-------------------------------

Measures:
- Sentence complexity (avg sentence length)
- Passive voice detection
- Action verb density
- Quantified achievement density (# bullets with numbers)
- Flesch Reading Ease (approx)
Returns a normalized readability score (0-100) and findings.

The goal: detect complex/wordy writing, highlight clarity issues, and
reward resumes with impactful, quantifiable bullet points.
"""

import re
from typing import Dict, List
from .ats_config import ATS_CONFIG

# Common action verb list (expandable)
ACTION_VERBS = [
    "developed", "created", "designed", "built", "implemented", "improved", "optimized",
    "led", "managed", "launched", "initiated", "enhanced", "engineered", "resolved",
    "coordinated", "executed", "drove", "modernized", "streamlined", "automated"
]

PASSIVE_PHRASES = [
    "was", "were", "is being", "are being", "has been", "have been", "had been",
    "was done", "was completed", "was created", "was developed"
]

def _split_sentences(text: str) -> List[str]:
    # Conservative split on ".", "!", "?"
    pieces = re.split(r'[\.!?]\s+', text)
    sentences = [s.strip() for s in pieces if len(s.strip()) > 5]
    return sentences

def _count_action_verbs(sentence: str) -> int:
    sent_l = sentence.lower()
    return sum(1 for v in ACTION_VERBS if v in sent_l)

def _has_number(sentence: str) -> bool:
    return bool(re.search(r'\d', sentence))

def _is_passive(sentence: str) -> bool:
    sent = sentence.lower()
    for p in PASSIVE_PHRASES:
        if p in sent:
            return True
    return False

def analyze_readability(text: str) -> Dict:
    """
    Returns:
      {
        "readability_score": int,
        "findings": [..],
        "stats": {
            "avg_sentence_length": float,
            "action_verb_ratio": float,
            "quantified_ratio": float,
            "passive_ratio": float
        }
      }
    """
    if not text:
        return {
            "readability_score": 0,
            "findings": ["No text provided."],
            "stats": {}
        }

    cfg = ATS_CONFIG.get("readability", {})

    sentences = _split_sentences(text)
    if not sentences:
        return {
            "readability_score": 0,
            "findings": ["Text too short for readability analysis."],
            "stats": {}
        }

    total_words = 0
    passive_count = 0
    action_verb_count = 0
    quantified_count = 0

    for s in sentences:
        words = s.split()
        total_words += len(words)
        if _is_passive(s):
            passive_count += 1
        if _count_action_verbs(s) > 0:
            action_verb_count += 1
        if _has_number(s):
            quantified_count += 1

    avg_len = total_words / max(1, len(sentences))
    passive_ratio = passive_count / len(sentences)
    action_ratio = action_verb_count / len(sentences)
    quantify_ratio = quantified_count / len(sentences)

    # Compute score components
    score = 0.0
    total_possible = 1.0  # baseline

    # 1) Ideal sentence length ~18 words
    target_len = cfg.get("target_sentence_length", 18)
    # Punch a normalized penalty for deviation
    deviation = abs(avg_len - target_len)
    length_score = max(0.0, 1.0 - (deviation / target_len))
    score += length_score
    total_possible += 1.0

    # 2) Reward action verbs
    action_weight = cfg.get("reward_action_verbs", 0.20)
    score += action_ratio * action_weight
    total_possible += action_weight

    # 3) Reward quantified bullets
    quant_weight = cfg.get("reward_quantified_bullets", 0.25)
    score += quantify_ratio * quant_weight
    total_possible += quant_weight

    # 4) Penalize passive voice
    passive_penalty = cfg.get("penalty_passive_voice", 0.15)
    score -= passive_ratio * passive_penalty

    # Normalize
    normalized = max(0.0, min(1.0, score / total_possible))
    readability_score = int(round(normalized * 100))

    findings = []
    if avg_len > target_len + 8:
        findings.append("Sentences appear too long — consider shorter, punchier bullets.")
    if passive_ratio > 0.20:
        findings.append("High passive voice detected — rewrite bullets using active voice.")
    if action_ratio < 0.20:
        findings.append("Few action verbs detected — start bullets with strong verbs.")
    if quantify_ratio < 0.15:
        findings.append("Very few quantified achievements — add measurable results (%, $, time).")

    return {
        "readability_score": readability_score,
        "findings": findings,
        "stats": {
            "avg_sentence_length": round(avg_len, 2),
            "action_verb_ratio": round(action_ratio, 2),
            "quantified_ratio": round(quantify_ratio, 2),
            "passive_ratio": round(passive_ratio, 2)
        }
    }
