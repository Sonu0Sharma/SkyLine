
"""
ATS v2 Configuration File
-------------------------

All weights, feature flags, thresholds, and model settings are defined here.
This allows you to tune the scoring system without touching code.

You can also create role-specific presets later.

"""

ATS_CONFIG = {

    # -----------------------------
    # FEATURE FLAGS
    # -----------------------------
    "enable_structure": True,
    "enable_keywords": True,
    "enable_semantics": True,
    "enable_readability": True,
    "enable_tone": True,
    "enable_insights": True,
    "enable_role_detection": True,

    # -----------------------------
    # SCORING WEIGHTS (generalized)
    # total = 1.0
    # -----------------------------
    "weights": {
        "structure": 0.18,
        "keywords": 0.30,
        "semantics": 0.22,
        "readability": 0.15,
        "tone": 0.15
    },

    # -----------------------------
    # KEYWORD ENGINE SETTINGS
    # -----------------------------
    "keyword": {
        "required_weight": 2.0,
        "preferred_weight": 1.0,
        "bonus_weight": 0.5,
        "fuzzy_threshold_strong": 85,
        "fuzzy_threshold_partial": 70,
        "max_keywords_considered": 80
    },

    # -----------------------------
    # SEMANTIC ENGINE SETTINGS
    # -----------------------------
    "semantic": {
        "embedding_model": "all-MiniLM-L6-v2",
        "max_sentences": 120,
        "min_similarity_for_match": 0.35,
        "high_similarity_threshold": 0.60
    },

    # -----------------------------
    # READABILITY SETTINGS
    # -----------------------------
    "readability": {
        "target_sentence_length": 18,
        "penalty_passive_voice": 0.15,
        "reward_action_verbs": 0.20,
        "reward_quantified_bullets": 0.25
    },

    # -----------------------------
    # TONE ANALYZER SETTINGS
    # -----------------------------
    "tone": {
        "min_action_verb_ratio": 0.25,
        "max_first_person_ratio": 0.12,
        "leadership_keywords": [
            "led", "managed", "supervised", "owned",
            "coordinated", "mentored", "directed"
        ]
    },

    # -----------------------------
    # ROLE DETECTION SETTINGS
    # -----------------------------
    "role_detection": {
        "enabled": True,
        "confidence_threshold": 0.42,
        "role_labels": [
            "frontend_developer", "backend_developer",
            "fullstack_developer", "designer",
            "product_manager", "data_scientist",
            "devops_engineer", "manager", "general"
        ]
    }
}
