"""
Keyword Engine for ATS v2
-------------------------
Extracts keywords from JD, assigns tiers (required, preferred, bonus),
and matches them against resume text.
"""

from typing import List, Dict, Tuple
import re
from rapidfuzz import fuzz
from collections import defaultdict

# Local config import (relative)
try:
    from .ats_config import ATS_CONFIG
except ImportError:
    ATS_CONFIG = {
        "keyword": {
            "fuzzy_threshold_strong": 85,
            "fuzzy_threshold_partial": 70,
            "max_keywords_considered": 80,
            "required_weight": 2.0,
            "preferred_weight": 1.0,
            "bonus_weight": 0.5
        }
    }

# ----- Cleaning -----
_NON_WORD_RE = re.compile(r'[^\w\s\+\#\-\.]')
_SPLIT_TOK_RE = re.compile(r'[\s,/;|]+')

def _clean_phrase(phrase: str) -> str:
    p = (phrase or "").strip()
    p = re.sub(_NON_WORD_RE, ' ', p)
    p = re.sub(r'\s+', ' ', p)
    return p.strip().lower()

def _norm_key(phrase: str) -> str:
    """Normalized key for raw_counts: keep dot-variants but stripped and lowercase."""
    if not phrase:
        return ""
    p = phrase.strip().lower()
    p = re.sub(r'\s+', ' ', p)
    return p

def _strip_punct(u: str) -> str:
    """Strip punctuation for comparison: react.js -> reactjs -> react"""
    return re.sub(r'[^\w]', '', (u or "").lower())

# ----- Known tech lexicon -----
COMMON_TECH_TERMS = set([
    "html5","html","css3","css","bootstrap","javascript","jquery","react","reactjs","react.js",
    "vue","angular","angular.js","nodejs","node","node.js","python","django","flask","java","spring",
    "sql","postgresql","mysql","aws","azure","gcp","docker","kubernetes","rest","graphql",
    "typescript","sass","less","photoshop","figma","sketch","responsive","accessibility","seo","json","xml"
])

# =====================================================================
# 1. CANDIDATE PHRASE EXTRACTION
# =====================================================================
def _extract_candidate_phrases(text: str, max_phrases: int = 120) -> List[str]:
    candidates = []

    if not text:
        return []

    # 1) Extract from skill/requirement lines (lines that mention skill/require/experience/knowledge)
    for line in text.splitlines():
        low = line.lower()
        if any(key in low for key in ["skill", "require", "experience", "knowledge", "must have", "nice to have", "preferred"]):
            # split on common separators but preserve dot-forms like "React.js"
            parts = re.split(r'[,:;\|\-]+', line)
            for part in parts:
                part = _clean_phrase(part)
                if not part:
                    continue
                # if it looks like a short phrase, keep it
                if 1 < len(part.split()) <= 6:
                    candidates.append(part)
                else:
                    # split into tokens and include meaningful tokens
                    for token in re.split(_SPLIT_TOK_RE, part):
                        tok = token.strip()
                        if tok and len(tok) > 1:
                            candidates.append(tok)

    # 2) Add known tech terms appearing anywhere in JD (preserve dot-variants)
    words = re.findall(r'[\w\+\#\-\.]+', text.lower())
    for w in words:
        if w in COMMON_TECH_TERMS:
            candidates.append(w)

    # 3) Fallback: top frequent tokens (longer than 2 chars)
    freq = defaultdict(int)
    for w in words:
        if len(w) > 2:
            freq[w] += 1

    for tok, _ in sorted(freq.items(), key=lambda kv: kv[1], reverse=True)[:50]:
        candidates.append(tok)

    # Ensure we also include dot/no-dot variants for common techs (react.js <-> react)
    expanded = []
    seen = set()
    for c in candidates:
        if not c:
            continue
        c_clean = _clean_phrase(c)
        # Add original cleaned
        if c_clean not in seen:
            expanded.append(c_clean)
            seen.add(c_clean)
        # add dotless variant (react.js -> reactjs -> react)
        stripped = _strip_punct(c_clean)
        if stripped and stripped not in seen:
            expanded.append(stripped)
            seen.add(stripped)
        # add dotted variant if token without dot exists and common (node -> node.js)
        if c_clean in COMMON_TECH_TERMS:
            dotted = c_clean
            if '.' not in dotted and (dotted + '.js') not in seen:
                maybe = dotted + '.js'
                if maybe not in seen:
                    expanded.append(maybe)
                    seen.add(maybe)
        if len(expanded) >= max_phrases:
            break

    return expanded[:max_phrases]


# =====================================================================
# 2. EXTRACT EXPLICIT JD BLOCKS (MUST HAVE, NICE TO HAVE)
# =====================================================================
def _extract_block_items_direct(jd_text: str) -> Dict[str, List[str]]:
    lines = jd_text.splitlines()
    n = len(lines)
    i = 0

    REQ_HEAD = re.compile(r'(must[\s\-]*have|required|requirements|essential)\s*:?', flags=re.IGNORECASE)
    PREF_HEAD = re.compile(r'(nice[\s\-]*to[\s\-]*have|preferred|desirable|preferably)\s*:?', flags=re.IGNORECASE)
    HEADING_LIKE = re.compile(r'^[A-Z0-9\s\-\(\)\/\.]{1,80}\s*:?\s*$')

    blocks = {"required": [], "preferred": []}

    while i < n:
        line = lines[i].strip()

        # Inline: "MUST HAVE: JavaScript, HTML"
        m_req_inline = re.search(r'(must[\s\-]*have|required|requirements)\s*:\s*(.+)$', line, flags=re.IGNORECASE)
        if m_req_inline:
            for item in re.split(r'[,\|;/]+', m_req_inline.group(2)):
                item_clean = _clean_phrase(item)
                if item_clean:
                    blocks["required"].append(item_clean)
            i += 1
            continue

        m_pref_inline = re.search(r'(nice[\s\-]*to[\s\-]*have|preferred|desirable)\s*:\s*(.+)$', line, flags=re.IGNORECASE)
        if m_pref_inline:
            for item in re.split(r'[,\|;/]+', m_pref_inline.group(2)):
                item_clean = _clean_phrase(item)
                if item_clean:
                    blocks["preferred"].append(item_clean)
            i += 1
            continue

        # Block bullets under heading
        if REQ_HEAD.search(line):
            j = i + 1
            while j < n:
                l = lines[j].strip()
                if not l:
                    break
                # stop if a new heading starts (all caps or ends with :)
                if HEADING_LIKE.match(l) and l.endswith(':'):
                    break
                m = re.match(r'^[\-\u2022\*\d\.\)]\s*(.+)$', l)
                if m:
                    blocks["required"].append(_clean_phrase(m.group(1)))
                else:
                    # if short line (likely a skill)
                    if 1 <= len(l.split()) <= 8:
                        blocks["required"].append(_clean_phrase(l))
                j += 1
            i = j
            continue

        if PREF_HEAD.search(line):
            j = i + 1
            while j < n:
                l = lines[j].strip()
                if not l:
                    break
                if HEADING_LIKE.match(l) and l.endswith(':'):
                    break
                m = re.match(r'^[\-\u2022\*\d\.\)]\s*(.+)$', l)
                if m:
                    blocks["preferred"].append(_clean_phrase(m.group(1)))
                else:
                    if 1 <= len(l.split()) <= 8:
                        blocks["preferred"].append(_clean_phrase(l))
                j += 1
            i = j
            continue

        i += 1

    # dedupe while preserving order
    def uniq(seq):
        seen = set()
        out = []
        for s in seq:
            if not s:
                continue
            if s not in seen:
                seen.add(s)
                out.append(s)
        return out

    return {"required": uniq(blocks["required"]), "preferred": uniq(blocks["preferred"])}


# =====================================================================
# 3. TIER DETECTION
# =====================================================================
def _detect_tiers_from_jd(jd_text: str, candidate_phrases: List[str]) -> Dict[str, List[str]]:
    block_items = _extract_block_items_direct(jd_text)

    # If explicit MUST HAVE / NICE TO HAVE found → trust them
    if block_items["required"] or block_items["preferred"]:
        required = []
        preferred = []
        bonus = []

        def match_block_items(block_list):
            mapped = []
            for bi in block_list:
                bi_norm = _clean_phrase(bi)
                bi_norm_strip = _strip_punct(bi_norm)
                for cand in candidate_phrases:
                    cand_norm = _clean_phrase(cand)
                    cand_norm_strip = _strip_punct(cand_norm)

                    # direct equality (preserve original candidate if matches)
                    if bi_norm == cand_norm:
                        mapped.append(cand)
                        continue

                    # compare stripped versions (react.js <-> react)
                    if bi_norm_strip and cand_norm_strip and (bi_norm_strip == cand_norm_strip):
                        mapped.append(cand)
                        continue

                    # token subset checks (both cleaned and stripped)
                    cand_tokens = set(re.findall(r'[\w\+\#\-\.]+', cand_norm))
                    bi_tokens = set(re.findall(r'[\w\+\#\-\.]+', bi_norm))

                    if bi_tokens and cand_tokens and (bi_tokens.issubset(cand_tokens) or cand_tokens.issubset(bi_tokens)):
                        mapped.append(cand)
                        continue

                # fallback: ensure the normalized item exists even if no candidate matched
                if not any(_clean_phrase(m) == bi_norm for m in mapped):
                    mapped.append(bi_norm)
            # dedupe preserving order
            seen = set()
            out = []
            for x in mapped:
                key = _clean_phrase(x)
                if key not in seen:
                    seen.add(key)
                    out.append(x)
            return out

        required = match_block_items(block_items["required"])
        preferred = match_block_items(block_items["preferred"])

        # Remaining unassigned → bonus
        bonus = [c for c in candidate_phrases if _clean_phrase(c) not in { _clean_phrase(x) for x in required+preferred }]

        def uniq(seq):
            seen = set()
            out = []
            for s in seq:
                if s and s not in seen:
                    seen.add(s)
                    out.append(s)
            return out

        return {
            "required": uniq([_clean_phrase(x) for x in required]),
            "preferred": uniq([_clean_phrase(x) for x in preferred]),
            "bonus": uniq([_clean_phrase(x) for x in bonus]),
        }

    # Fallback heuristic tiers (old behavior)
    required = []
    preferred = []
    bonus = []

    sections = re.split(r'\n{2,}', jd_text.lower())
    for sec in sections:
        if "must have" in sec or "required" in sec:
            for c in candidate_phrases:
                if c in sec:
                    required.append(c)
        elif "preferred" in sec or "nice to have" in sec:
            for c in candidate_phrases:
                if c in sec:
                    preferred.append(c)

    top = "\n".join(jd_text.lower().splitlines()[:12])
    for c in candidate_phrases:
        if c in top and c not in required and c not in preferred:
            preferred.append(c)

    for c in candidate_phrases:
        if c not in required and c not in preferred:
            bonus.append(c)

    # normalize outputs
    return {
        "required": [_clean_phrase(x) for x in required],
        "preferred": [_clean_phrase(x) for x in preferred],
        "bonus": [_clean_phrase(x) for x in bonus],
    }


# =====================================================================
# 4. FUZZY MATCHER
# =====================================================================
def _fuzzy_match_phrase(phrase: str, resume_text: str, strong_thr: int, partial_thr: int):
    resume_text = (resume_text or "").lower()
    phrase = (phrase or "").lower().strip()

    if not phrase:
        return ("none", 0, 0.0)

    # direct substring
    if phrase in resume_text:
        return ("strong", 100, 1.0)

    # fallback sliding window fuzzy compare
    best = 0
    tokens = re.findall(r'[\w\+\#\-\.]+', resume_text)
    p_tokens = phrase.split()
    max_n = min(len(tokens), max(1, len(p_tokens) + 2))

    for n in range(1, max_n + 1):
        for i in range(len(tokens) - n + 1):
            window = " ".join(tokens[i:i+n])
            score = fuzz.ratio(phrase, window)
            if score > best:
                best = score
            if best >= 98:
                break
        if best >= 98:
            break

    if best >= strong_thr:
        return ("strong", int(best), best / 100.0)
    if best >= partial_thr:
        return ("partial", int(best), best / 100.0)
    return ("none", int(best), best / 100.0)


# =====================================================================
# 5. MAIN ENTRYPOINT
# =====================================================================
def analyze_keywords(jd_text: str, resume_text: str, max_keywords: int = None) -> Dict:
    if not jd_text or not resume_text:
        return {"total_keyword_score": 0, "breakdown": {}, "raw_counts": {}, "tiers_detected": {}}

    cfg = ATS_CONFIG.get("keyword", {})
    strong_thr = int(cfg.get("fuzzy_threshold_strong", 85))
    partial_thr = int(cfg.get("fuzzy_threshold_partial", 70))
    max_considered = int(cfg.get("max_keywords_considered", 80))
    max_keywords = max_keywords or max_considered

    candidates = _extract_candidate_phrases(jd_text, max_phrases=max_keywords)
    tiers = _detect_tiers_from_jd(jd_text, candidates)

    # trim tiers
    for k in tiers:
        tiers[k] = tiers[k][:max_keywords]

    weight_map = {
        "required": float(cfg.get("required_weight", 2.0)),
        "preferred": float(cfg.get("preferred_weight", 1.0)),
        "bonus": float(cfg.get("bonus_weight", 0.5)),
    }

    raw_counts: Dict[str, Dict] = {}
    results = {
        "required": {"matched": [], "partial": [], "missing": []},
        "preferred": {"matched": [], "partial": [], "missing": []},
        "bonus": {"matched": [], "partial": [], "missing": []},
    }
    weighted_sum = 0.0
    weight_total = 0.0

    for tier in ["required", "preferred", "bonus"]:
        tier_weight = weight_map.get(tier, 1.0)
        for phrase in tiers.get(tier, []):
            phrase_key = _norm_key(phrase)
            status, score, ratio = _fuzzy_match_phrase(phrase_key, resume_text, strong_thr, partial_thr)

            # store raw_counts using stable cleaned key
            raw_counts[phrase_key] = {"status": status, "score": score, "ratio": ratio, "tier": tier}

            if status == "strong":
                results[tier]["matched"].append({"phrase": phrase_key, "score": score})
                weighted_sum += tier_weight * 1.0
            elif status == "partial":
                results[tier]["partial"].append({"phrase": phrase_key, "score": score})
                weighted_sum += tier_weight * 0.6
            else:
                results[tier]["missing"].append({"phrase": phrase_key})
                # no weight added for missing

            weight_total += tier_weight

    total_score = 0
    if weight_total > 0:
        total_score = int(round(min(1.0, weighted_sum / weight_total) * 100))

    return {
        "total_keyword_score": total_score,
        "breakdown": results,
        "raw_counts": raw_counts,
        "tiers_detected": tiers
    }


# Compatibility alias for old tests that import `score_keywords`
def score_keywords(jd_text: str, resume_text: str, max_keywords: int = None) -> Dict:
    return analyze_keywords(jd_text, resume_text, max_keywords=max_keywords)
