import spacy
from rapidfuzz import fuzz
from backend.services.llm_engine import LLMEngine
from backend.services.text_cleaner import clean_text  # NEW import

# Try loading SpaCy, fallback to simple splitting if not installed
try:
    nlp = spacy.load("en_core_web_sm")
except:
    nlp = None

def calculate_keyword_match(resume_text: str, jd_text: str) -> dict:
    """
    Analyzes keyword overlap between Resume and JD using NLP/Fuzzy logic.
    """
    # Defensive cleaning (ensure consistent tokens)
    resume_text = clean_text(resume_text or "", redact=False)
    jd_text = clean_text(jd_text or "", redact=False)

    # 1. Basic Tokenization (Use SpaCy if available, else split)
    if nlp:
        resume_doc = nlp(resume_text.lower())
        jd_doc = nlp(jd_text.lower())
        # Extract nouns and proper nouns as "Keywords"
        resume_keywords = {token.text for token in resume_doc if token.pos_ in ["NOUN", "PROPN"]}
        jd_keywords = {token.text for token in jd_doc if token.pos_ in ["NOUN", "PROPN"]}
    else:
        resume_keywords = set(resume_text.lower().split())
        jd_keywords = set(jd_text.lower().split())

    # 2. Find Missing Keywords
    missing = []
    matches = 0
    
    # We check the top significant words from JD
    for word in jd_keywords:
        if len(word) < 4: continue # Skip short words
        
        # Fuzzy match: Is 'word' approximately in resume text?
        # This handles plurals like "Developer" vs "Developers"
        found = False
        for r_word in resume_keywords:
            if fuzz.ratio(word, r_word) > 85:
                found = True
                break
        
        if found:
            matches += 1
        else:
            missing.append(word)

    # 3. Calculate Math Score (0-100)
    total_important_words = len([w for w in jd_keywords if len(w) > 3])
    if total_important_words == 0:
        match_score = 50 # Default if JD is empty
    else:
        match_score = (matches / total_important_words) * 100

    return {
        "match_percentage": min(round(match_score, 1), 100),
        "missing_keywords": list(missing)[:10] # Top 10 missing
    }

def get_ats_report(resume_text: str, jd_text: str) -> dict:
    """
    Combines Math Score (RapidFuzz) + Semantic Score (AI).
    """
    # Clean inputs first (defense-in-depth)
    resume_text = clean_text(resume_text or "", redact=False)
    jd_text = clean_text(jd_text or "", redact=False)

    # 1. Get Hard Skills Score (Math)
    keyword_data = calculate_keyword_match(resume_text, jd_text)
    
    # 2. Get Soft Skills/Analysis (AI)
    prompt = f"""
    Act as an ATS (Applicant Tracking System) Expert.
    
    Resume Text:
    {resume_text[:2000]}
    
    Job Description:
    {jd_text[:2000]}
    
    Task:
    1. Give a 'Semantic Match Score' (0-100) based on relevance/experience.
    2. Provide a 1-sentence summary of why the score is high or low.
    3. List 3 specific improvements.

    Output JSON format:
    {{
        "semantic_score": 85,
        "summary": "Candidate has strong Python skills but lacks Cloud experience.",
        "improvements": ["Add AWS details", "Fix formatting", "Quantify results"]
    }}
    """
    
    # We reuse your existing LLM Engine logic, assuming it returns a JSON string or dict
    # Note: We are using a trick here to parse the text response into a dict manually if needed
    # but for simplicity, let's ask the LLMEngine helper
    try:
        import json
        ai_response_str = LLMEngine.generate_response(prompt, task_type="ats")
        
        # Clean up JSON if LLM added markdown wrappers
        clean_json = ai_response_str.replace("```json", "").replace("```", "").strip()
        ai_data = json.loads(clean_json)
    except:
        # Fallback if AI fails or mocks
        ai_data = {
            "semantic_score": keyword_data['match_percentage'],
            "summary": "AI analysis unavailable. Score based on keyword matching.",
            "improvements": ["Ensure keywords match JD exactly."]
        }

    # 3. Final Weighted Score
    # 40% Keyword Match (Hard Skills) + 60% AI Score (Context)
    final_score = (keyword_data['match_percentage'] * 0.4) + (ai_data.get('semantic_score', 0) * 0.6)

    return {
        "total_score": round(final_score),
        "breakdown": {
            "keyword_match": keyword_data['match_percentage'],
            "semantic_match": ai_data.get('semantic_score', 0)
        },
        "missing_keywords": keyword_data['missing_keywords'],
        "summary": ai_data.get('summary'),
        "improvements": ai_data.get('improvements', [])
    }
