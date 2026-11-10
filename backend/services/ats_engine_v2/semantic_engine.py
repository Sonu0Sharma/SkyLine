# backend/services/ats_engine_v2/semantic_engine.py
"""
Semantic Similarity Engine for ATS v2
-------------------------------------

... (kept your original module docstring) ...
"""

import re
from typing import Dict, List

try:
    from sentence_transformers import SentenceTransformer, util
    EMB_AVAILABLE = True
except Exception:
    EMB_AVAILABLE = False

from .ats_config import ATS_CONFIG

_MODEL = None

def _load_model():
    global _MODEL
    if _MODEL is None and EMB_AVAILABLE:
        name = ATS_CONFIG.get("semantic", {}).get("embedding_model", "all-MiniLM-L6-v2")
        _MODEL = SentenceTransformer(name)
    return _MODEL

def _split_into_sentences(text: str) -> List[str]:
    """
    Rough sentence splitting focused on resume bullet patterns.
    """
    parts = re.split(r'[\n•\-\*\.]+', text)
    sents = [p.strip() for p in parts if len(p.strip()) > 5]
    return sents[: ATS_CONFIG.get("semantic", {}).get("max_sentences", 120)]

def compute_semantic_similarity(resume_text: str, jd_text: str) -> Dict:
    if not resume_text or not jd_text:
        return {
            "semantic_score": 0,
            "high_matches": [],
            "weak_matches": [],
            "missing_requirements": [],
            "stats": {}
        }

    model = _load_model()
    if not model:
        # fallback if embeddings unavailable
        return {
            "semantic_score": 50,
            "high_matches": [],
            "weak_matches": [],
            "missing_requirements": ["Semantic model unavailable"],
            "stats": {},
            # helpful downstream: include an example_snippet as fallback
            "example_snippet": None
        }

    # Split into sentence-level units
    resume_sents = _split_into_sentences(resume_text)
    jd_sents = _split_into_sentences(jd_text)

    if not resume_sents or not jd_sents:
        return {
            "semantic_score": 0,
            "high_matches": [],
            "weak_matches": [],
            "missing_requirements": [],
            "stats": {"reason": "No sentences to compare"},
            "example_snippet": resume_sents[0] if resume_sents else None
        }

    # Encode
    resume_emb = model.encode(resume_sents, convert_to_tensor=True)
    jd_emb = model.encode(jd_sents, convert_to_tensor=True)

    # Compute similarity matrix
    sim_matrix = util.cos_sim(resume_emb, jd_emb)  # [R x J]

    strong_threshold = ATS_CONFIG["semantic"].get("high_similarity_threshold", 0.60)
    min_match = ATS_CONFIG["semantic"].get("min_similarity_for_match", 0.35)

    high_matches = []
    weak_matches = []
    missing_reqs = []

    # For each JD requirement sentence, find best matching resume sentence
    for j_idx, jd_sent in enumerate(jd_sents):
        col = sim_matrix[:, j_idx]  # all resume sentences vs this JD sentence
        best_idx = int(col.argmax())
        best_score = float(col[best_idx])

        if best_score >= strong_threshold:
            high_matches.append({
                "jd": jd_sent,
                "resume": resume_sents[best_idx],
                "similarity": round(best_score, 3)
            })
        elif best_score >= min_match:
            weak_matches.append({
                "jd": jd_sent,
                "resume": resume_sents[best_idx],
                "similarity": round(best_score, 3)
            })
        else:
            # No meaningful alignment
            missing_reqs.append(jd_sent)

    # Compute global average similarity
    avg_similarity = float(sim_matrix.mean())

    # Map similarity to score 0–100
    def map_score(sim):
        if sim < 0.15: return 10
        if sim < 0.30: return 35
        if sim < 0.45: return 55
        if sim < 0.60: return 70
        if sim < 0.75: return 80
        if sim < 0.90: return 90
        return 100

    semantic_score = map_score(avg_similarity)

    # Choose best example snippet for downstream "before" usage:
    example_snippet = None
    if high_matches:
        example_snippet = high_matches[0].get("resume")
    elif weak_matches:
        example_snippet = weak_matches[0].get("resume")
    else:
        # If nothing matched, choose a short representative resume sentence if available
        example_snippet = resume_sents[0] if resume_sents else None

    return {
        "semantic_score": semantic_score,
        "high_matches": high_matches[:10],  # limit for readability
        "weak_matches": weak_matches[:10],
        "missing_requirements": missing_reqs[:10],
        "stats": {
            "avg_similarity": round(avg_similarity, 3),
            "strong_alignment_count": len(high_matches),
            "weak_alignment_count": len(weak_matches)
        },
        # New key: an example resume sentence (useful for AI rewrite "before")
        "example_snippet": example_snippet
    }
