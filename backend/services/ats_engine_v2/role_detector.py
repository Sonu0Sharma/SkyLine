"""
Role Detector for ATS v2
------------------------

Purpose:
- Infer a likely role cluster for a resume (frontend, backend, data, designer, PM, devops, manager, general).
- Provide a confidence score and label; used to select role-specific weighting presets and benchmark groups.
- Uses sentence-transformer embeddings if available; otherwise falls back to a simple keyword-based heuristic.

Design goals:
- Lightweight and interpretable.
- Ability to add/update centroids for new roles later.
- Returns: { "role": "<label>", "confidence": 0.0, "method": "embedding"|"heuristic", "details": {...} }
"""

from typing import Dict, Tuple, List
import math
import logging

try:
    from sentence_transformers import SentenceTransformer, util
    EMB_AVAILABLE = True
except Exception:
    EMB_AVAILABLE = False

from .ats_config import ATS_CONFIG

logger = logging.getLogger(__name__)

# Simple, extendable role keywords for heuristic fallback
ROLE_KEYWORDS = {
    "frontend_developer": ["html", "css", "javascript", "react", "vue", "angular", "bootstrap", "responsive"],
    "backend_developer": ["python", "java", "node", "django", "flask", "spring", "sql", "database", "api"],
    "fullstack_developer": ["fullstack", "frontend", "backend", "react", "node", "api"],
    "designer": ["figma", "sketch", "photoshop", "ui", "ux", "prototype", "design"],
    "product_manager": ["product", "roadmap", "stakeholder", "pr", "pm", "prioritiz"],
    "data_scientist": ["data", "machine learning", "ml", "pandas", "numpy", "tensorflow", "scikit"],
    "devops_engineer": ["docker", "kubernetes", "ci/cd", "terraform", "aws", "gcp", "jenkins"],
    "manager": ["managed", "led", "supervised", "team", "people", "directed"],
    "general": []
}

# Precomputed centroids placeholder (empty). In production, compute and persist centroid embeddings for each role.
# Format: {"role_label": embedding_vector}
_ROLE_CENTROIDS = {}

# Helper: load model lazily
_MODEL = None
def _get_embedding_model(model_name: str = None):
    global _MODEL
    if _MODEL is None:
        try:
            model_name = model_name or ATS_CONFIG.get("semantic", {}).get("embedding_model", "all-MiniLM-L6-v2")
            if EMB_AVAILABLE:
                _MODEL = SentenceTransformer(model_name)
                logger.info(f"RoleDetector: loaded embedding model {model_name}")
        except Exception as e:
            logger.error("Failed to load embedding model for RoleDetector: %s", e, exc_info=True)
            _MODEL = None
    return _MODEL

def _compute_centroid_for_role(role_label: str, example_texts: List[str], model) -> object:
    """
    Compute & return centroid embedding given example texts (list of representative JD/resume snippets).
    In practice, you should precompute centroids on a labeled dataset and store them.
    """
    if not model or not example_texts:
        return None
    try:
        embs = model.encode(example_texts, convert_to_tensor=True)
        centroid = embs.mean(dim=0)
        return centroid
    except Exception as e:
        logger.error("Error computing centroid: %s", e, exc_info=True)
        return None

def _nearest_centroid_label(embedding, centroids: Dict[str, object]) -> Tuple[str, float]:
    """
    Given an embedding and a dict of centroids, return (label, similarity)
    similarity in [0..1]
    """
    best_label = "general"
    best_sim = 0.0
    try:
        for label, cent in centroids.items():
            # util.cos_sim returns tensor; use float
            sim = float(util.cos_sim(embedding, cent).item())
            if sim > best_sim:
                best_sim = sim
                best_label = label
    except Exception as e:
        logger.debug("Centroid similarity error: %s", e)
    return best_label, float(best_sim)

def _heuristic_role_detection(text: str) -> Tuple[str, float, Dict]:
    """
    Fallback keyword driven detection: count keyword hits per role and normalize.
    Returns (label, confidence, details)
    """
    t = text.lower()
    scores = {}
    for role, keys in ROLE_KEYWORDS.items():
        cnt = 0
        for k in keys:
            if k in t:
                cnt += 1
        scores[role] = cnt

    # pick best
    best_role = max(scores, key=lambda r: scores[r])
    best_count = scores[best_role]
    total = sum(scores.values()) if sum(scores.values()) > 0 else 1
    confidence = float(best_count) / float(total) if total > 0 else 0.0
    # If all counts are zero, return general with low confidence
    if best_count == 0:
        return ("general", 0.05, {"scores": scores})
    return (best_role, min(1.0, confidence), {"scores": scores})

def detect_role(text: str) -> Dict:
    """
    Public entrypoint.

    Returns:
      {
        "role": "frontend_developer",
        "confidence": 0.73,
        "method": "embedding" or "heuristic",
        "details": {...}
      }
    """
    if not text or not text.strip():
        return {"role": "general", "confidence": 0.0, "method": "none", "details": {}}

    cfg = ATS_CONFIG.get("role_detection", {})
    enabled = cfg.get("enabled", True)
    if not enabled:
        return {"role": "general", "confidence": 0.0, "method": "disabled", "details": {}}

    # Try embedding-based detection if available & centroids exist
    model = _get_embedding_model()
    if EMB_AVAILABLE and model and _ROLE_CENTROIDS:
        try:
            # embed the full text (or first N chars)
            snippet = text[:3000]
            emb = model.encode(snippet, convert_to_tensor=True)
            label, sim = _nearest_centroid_label(emb, _ROLE_CENTROIDS)
            # confidence mapping: scale sim (0..1) to conservative confidence
            confidence = float(sim)
            if confidence >= cfg.get("confidence_threshold", 0.42):
                return {"role": label, "confidence": confidence, "method": "embedding", "details": {"similarity": confidence}}
            # else fallthrough to heuristic
        except Exception as e:
            logger.debug("Embedding role detection error: %s", e, exc_info=True)

    # Fallback heuristic
    role, conf, details = _heuristic_role_detection(text)
    return {"role": role, "confidence": conf, "method": "heuristic", "details": details}
