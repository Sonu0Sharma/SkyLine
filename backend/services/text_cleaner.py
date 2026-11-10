import re
import unicodedata
from typing import Tuple

# Conservative defaults
DEFAULT_MAX_CHARS = 20000

_email_re = re.compile(r'[\w\.-]+@[\w\.-]+\.\w+', flags=re.IGNORECASE)
_phone_re = re.compile(r'(\+?\d{1,3}[\s\-\.])?(?:\(?\d{2,4}\)?[\s\-\.]?)?\d{3,4}[\s\-\.]?\d{3,4}')

def _normalize_unicode(text: str) -> str:
    return unicodedata.normalize("NFKC", text)

def _remove_common_page_artifacts(text: str) -> str:
    # Remove common "Page X of Y" footers and long repeated header lines
    text = re.sub(r'page\s*\d+\s*(of\s*\d+)?', '', text, flags=re.IGNORECASE)
    text = re.sub(r'^\s*[-=]{2,}\s*$', '', text, flags=re.MULTILINE)  # lines of ----- or ====
    # Remove repeated short lines (header/footer repeats) that occur 3+ times
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    counts = {}
    for line in lines:
        counts[line] = counts.get(line, 0) + 1
    for line, cnt in counts.items():
        if cnt >= 3 and len(line) < 40:
            text = text.replace(line, '')
    return text

def _fix_hyphenation(text: str) -> str:
    # Merge words broken with hyphen + newline: "devel-\nopment" -> "development"
    text = re.sub(r'([A-Za-z0-9])-\n\s*([A-Za-z0-9])', r'\1\2', text)
    return text

def _normalize_newlines(text: str) -> str:
    # Convert Windows CRLF to LF
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    # Preserve paragraphs: collapse 3+ newlines to exactly 2
    text = re.sub(r'\n{3,}', '\n\n', text)
    # Convert single line breaks that likely were line wraps into spaces, but keep paragraph breaks (double-newline)
    paragraphs = text.split('\n\n')
    paragraphs = [' '.join(line.strip() for line in p.splitlines() if line.strip()) for p in paragraphs]
    text = '\n\n'.join(paragraphs)
    return text

def _collapse_whitespace(text: str) -> str:
    # Collapse multiple spaces
    text = re.sub(r'[ \t]{2,}', ' ', text)
    # Trim leading/trailing spaces on each line
    text = '\n'.join(line.strip() for line in text.splitlines())
    return text.strip()

def redact_pii(text: str) -> str:
    # Replace emails and phone numbers with placeholders
    text = _email_re.sub('[redacted_email]', text)
    text = _phone_re.sub('[redacted_phone]', text)
    return text

def clean_text(raw_text: str, redact: bool = False, max_chars: int = DEFAULT_MAX_CHARS) -> str:
    """
    Conservative cleaning for resume / job-description text.
    - redact: whether to remove/replace emails and phone numbers (default False)
    - max_chars: truncation length to protect downstream token usage
    Returns a cleaned string (trimmed & normalized).
    """
    if not raw_text:
        return ""

    text = _normalize_unicode(raw_text)
    text = text.replace('\xa0', ' ')  # no-break spaces -> regular spaces
    text = _remove_common_page_artifacts(text)
    text = _fix_hyphenation(text)
    text = _normalize_newlines(text)
    text = _collapse_whitespace(text)

    if redact:
        text = redact_pii(text)

    # final trim & limit
    text = text.strip()
    if len(text) > max_chars:
        text = text[:max_chars].rsplit(' ', 1)[0]  # truncate safely on word boundary

    return text
