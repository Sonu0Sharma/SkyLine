"""
Insights Engine for ATS v2
--------------------------

Purpose:
Convert raw ATS module outputs into *meaningful, actionable guidance* for the user.

Inputs expected:
{
  "structure": {...},
  "keywords": {...},
  "semantics": {...},
  "readability": {...},
  "tone": {...},
  "role": {...}
}

Outputs:
{
  "quick_wins": [...],
  "section_recommendations": {...},
  "gap_analysis": [...],
  "before_after_examples": [...],
  "overall_summary": "..."
}

This module does not score anything — it interprets, explains, and prioritizes.
"""

from typing import Dict, List

def _summarize_structure(struct_data: Dict) -> List[str]:
    findings = struct_data.get("findings", [])
    tips = []
    for f in findings:
        if "missing" in f.lower():
            tips.append(f"Add missing section: {f.replace('Missing section:', '').strip()}")
        elif "formatting" in f.lower():
            tips.append("Improve formatting for ATS readability (consistent headers, bullet spacing).")
        else:
            tips.append(f)
    return tips[:5]

def _summarize_keywords(keyword_data: Dict) -> List[str]:
    missing = keyword_data.get("missing_keywords", [])
    tips = []
    for kw in missing[:8]:
        tips.append(f"Add or strengthen relevance for keyword: '{kw}'.")
    return tips

def _summarize_semantics(sem_data: Dict) -> List[str]:
    missing = sem_data.get("missing_requirements", [])
    tips = []
    for m in missing[:6]:
        tips.append(f"Resume does not reflect the requirement: '{m[:80]}...' — add relevant experience or project.")
    return tips

def _summarize_readability(read_data: Dict) -> List[str]:
    return read_data.get("findings", [])[:5]

def _summarize_tone(tone_data: Dict) -> List[str]:
    return tone_data.get("findings", [])[:5]

def _quick_wins(struct, keywords, sem, read, tone) -> List[str]:
    """
    Highest impact *fastest* improvements.
    """
    wins = []

    # Keyword gaps
    mk = keywords.get("missing_keywords", [])
    if mk:
        wins.append(f"Add these missing keywords to improve match: {', '.join(mk[:5])}")

    # Semantic high-impact gaps
    sem_missing = sem.get("missing_requirements", [])
    if sem_missing:
        wins.append(f"Your resume does not address '{sem_missing[0]}' — adding 1-2 lines can boost semantic score.")

    # Readability: actionable
    if read.get("findings"):
        wins.append(f"Readability issue: {read['findings'][0]}")

    # Tone issues
    if tone.get("findings"):
        wins.append(f"Tone improvement: {tone['findings'][0]}")

    # Structure
    if struct.get("findings"):
        wins.append(f"Structural fix: {struct['findings'][0]}")

    return wins[:5]

def _before_after_examples(keywords, readability, tone) -> List[Dict]:
    """
    Creates a few synthetic examples to show improvement direction.
    """
    examples = []

    if keywords.get("missing_keywords"):
        kw = keywords["missing_keywords"][0]
        examples.append({
            "before": f"Worked on various development tasks.",
            "after": f"Developed responsive UI components using {kw}, improving load time by 20%."
        })

    if "Sentences appear too long" in " ".join(readability.get("findings", [])):
        examples.append({
            "before": "I was responsible for creating features and worked with the team on many tasks.",
            "after": "Developed and deployed 6+ UI features, collaborating cross-functionally to improve UX flow."
        })

    if tone.get("findings"):
        examples.append({
            "before": "Sometimes I helped with design tasks and maybe improved layouts.",
            "after": "Optimized UI layouts and collaborated with designers, improving user engagement by 12%."
        })

    return examples[:3]

def generate_insights(ats_data: Dict) -> Dict:
    """
    Main function: generate insights from all modules.
    """

    struct = ats_data.get("structure", {})
    keywords = ats_data.get("keywords", {})
    semantics = ats_data.get("semantics", {})
    readability = ats_data.get("readability", {})
    tone = ats_data.get("tone", {})
    role = ats_data.get("role", {})

    insights = {}

    # 1. Quick Wins (Most important)
    insights["quick_wins"] = _quick_wins(struct, keywords, semantics, readability, tone)

    # 2. Section-Specific Recommendations
    insights["section_recommendations"] = {
        "structure": _summarize_structure(struct),
        "keywords": _summarize_keywords(keywords),
        "semantic_alignment": _summarize_semantics(semantics),
        "readability": _summarize_readability(readability),
        "tone": _summarize_tone(tone)
    }

    # 3. Gap Analysis (Detailed)
    insights["gap_analysis"] = _summarize_semantics(semantics)[:10]

    # 4. Before/After Examples
    insights["before_after_examples"] = _before_after_examples(
        keywords, readability, tone
    )

    # 5. Overall Summary
    role_label = role.get("role", "general")
    role_conf = role.get("confidence", 0)

    insights["overall_summary"] = (
        f"Your resume aligns well with a '{role_label}' role "
        f"(confidence {round(role_conf,2)}). "
        "The recommendations above target missing skills, structural refinement, and clearer, action-driven writing. "
        "Applying these changes will significantly increase recruiter and ATS visibility."
    )

    return insights
