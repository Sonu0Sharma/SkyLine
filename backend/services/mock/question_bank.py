import random

QUESTION_BANK = {
    "general": {
        "Easy": ["Tell me about yourself.", "Describe a strength."],
        "Medium": ["Describe a challenge you faced.", "How do you handle conflict?"],
        "Hard": ["Explain your 5-year plan.", "Describe a failure and what you learned."]
    },
    "frontend": {
        "Easy": ["What is the DOM?", "Explain CSS box model."],
        "Medium": ["Explain React useEffect.", "What is Event Bubbling?"],
        "Hard": ["How does React Fiber work?", "Optimize a slow React app."]
    },
    "backend": {
        "Easy": ["What is a REST API?", "GET vs POST?"],
        "Medium": ["Explain SQL Indexing.", "What is a JWT?"],
        "Hard": ["Design a scalable notification system.", "Explain CAP theorem."]
    }
}

# Helper for imports
SAMPLE_QUESTIONS = QUESTION_BANK["general"]["Medium"]

def get_random_question(role: str, difficulty: str = "Medium") -> str:
    role = role.lower() if role else "general"
    if role not in QUESTION_BANK: role = "general"
    
    # Try exact match
    pool = QUESTION_BANK.get(role, {}).get(difficulty, [])
    if pool: return random.choice(pool)
    
    # Fallback generic
    return random.choice(QUESTION_BANK["general"]["Medium"])