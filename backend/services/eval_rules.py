# backend/services/eval_rules.py
"""
Deterministic (rule-based) answer evaluation used as fallback.
Returns a structured dict with:
{ score: int, feedback: str, strengths: [], weaknesses: [], metrics: {...} }
"""

import re

ACTION_VERBS = set([
    "developed","created","designed","built","implemented","improved","optimized",
    "led","managed","launched","initiated","enhanced","engineered","resolved",
    "coordinated","executed","drove","modernized","streamlined","automated",
    "owned","mentored","supervised","directed","spearheaded"
])

HEDGING = re.compile(r'\b(might|could|maybe|possibly|may|might be|may be)\b', re.IGNORECASE)
NUM_RE = re.compile(r'\d+')

def _count_action_verbs(answer: str) -> int:
    a = answer.lower()
    return sum(1 for v in ACTION_VERBS if re.search(r'\b' + re.escape(v) + r'\b', a))

def _count_numbers(answer: str) -> int:
    return len(NUM_RE.findall(answer))

def _hedging_count(answer: str) -> int:
    return len(HEDGING.findall(answer))

def evaluate_answer_rule_based(question: str, answer: str) -> dict:
    if not answer or not answer.strip():
        return {"score": 0, "feedback": "No answer provided", "strengths": [], "weaknesses": ["No answer"], "metrics": {}}
    wc = len(answer.strip().split())
    action_cnt = _count_action_verbs(answer)
    num_cnt = _count_numbers(answer)
    hedge = _hedging_count(answer)

    # Length score (ideal 20-120 words)
    length_score = max(0, min(25, (min(120, wc) / 120) * 25))
    action_score = min(25, action_cnt * 7)  # each action verb gives credit
    quantified_score = min(25, (num_cnt * 8))  # each number gives credit
    hedging_penalty = min(10, hedge * 5)

    raw = length_score + action_score + quantified_score - hedging_penalty
    score = int(max(0, min(100, raw)))

    strengths = []
    weaknesses = []
    if action_cnt >= 1:
        strengths.append(f"Uses action verbs ({action_cnt}).")
    if num_cnt >= 1:
        strengths.append(f"Provides quantified details ({num_cnt}).")
    if wc >= 20:
        strengths.append("Answer length is appropriate.")
    if hedge:
        weaknesses.append("Hedging language detected; be more assertive.")
    if action_cnt == 0:
        weaknesses.append("Few action verbs — start bullets with strong verbs.")

    feedback = f"Score: {score}/100 — length:{int(length_score)}, action:{int(action_score)}, quantified:{int(quantified_score)}, hedging_penalty:{int(hedging_penalty)}."

    return {
        "score": score,
        "feedback": feedback,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "metrics": {
            "word_count": wc,
            "action_verbs": action_cnt,
            "numeric_mentions": num_cnt,
            "hedging_count": hedge,
            "raw_components": {
                "length_score": int(length_score),
                "action_score": int(action_score),
                "quantified_score": int(quantified_score),
                "hedging_penalty": int(hedging_penalty)
            }
        }
    }
