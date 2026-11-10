import os
import re
import json
import time
import random
import logging
from pathlib import Path
from typing import Dict, Optional, Any, List
from dotenv import load_dotenv
from openai import OpenAI
import google.generativeai as genai
from backend.config import get_settings
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeoutError

# --- Configuration & Setup ---
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

settings = get_settings()
logger = logging.getLogger(__name__)

# --- Runtime Configuration (tunable via env) ---
CONFIG = {
    "MAX_RETRIES": int(os.environ.get("LLM_MAX_RETRIES", 2)),
    "BASE_TIMEOUT": int(os.environ.get("LLM_TIMEOUT", 15)),
    "MAX_INPUT_TOKENS": int(os.environ.get("LLM_MAX_INPUT_TOKENS", 3500)),  # Approx chars
    "DETERMINISTIC_WORD_LIMIT": int(os.environ.get("LLM_DETERMINISTIC_WORD_LIMIT", 35)),
    "LOG_LEVEL": getattr(settings, "ENV", "production"),  # 'development' or 'production'
    "GEMINI_MODEL": os.environ.get("GEMINI_MODEL", "gemini-pro"),
}

# Initialize Groq Client (if configured)
client: Optional[OpenAI] = None
_groq_api_key = os.environ.get("GROQ_API_KEY") or getattr(settings, "GROQ_API_KEY", None)
if _groq_api_key:
    try:
        client = OpenAI(
            base_url=os.environ.get("GROQ_BASE_URL", "https://api.groq.com/openai/v1"),
            api_key=_groq_api_key,
            timeout=CONFIG["BASE_TIMEOUT"]
        )
        logger.info("✅ LLM Engine: Connected to Groq")
    except Exception as e:
        logger.error("Groq Init Error: %s", str(e))

# Configure Gemini (genai) if key present
_gemini_key = getattr(settings, "GEMINI_API_KEY", None)
if _gemini_key:
    try:
        genai.configure(api_key=_gemini_key)
    except Exception:
        logger.warning("Gemini configure failed.")


class LLMEngine:
    # ---------------------------------------------------------
    # 1. INPUT SAFETY & PREPROCESSING
    # ---------------------------------------------------------
    @staticmethod
    def _redact_pii(text: str) -> str:
        """Conservative PII redaction (emails + common phone patterns)."""
        if not text:
            return ""
        # Emails
        text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b', '[EMAIL]', text)
        # Phone numbers (US/Intl common formats)
        text = re.sub(r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', '[PHONE]', text)
        return text

    @staticmethod
    def _truncate_input(text: str, max_chars: Optional[int] = None) -> str:
        """Hard truncate to prevent context overflow. Uses CONFIG limit by default."""
        if text is None:
            return ""
        limit = max_chars if max_chars is not None else CONFIG["MAX_INPUT_TOKENS"]
        if len(text) > limit:
            logger.warning("Input truncated from %d to %d chars.", len(text), limit)
            return text[:limit] + "...(truncated)"
        return text

    # ---------------------------------------------------------
    # 2. OUTPUT CLEANING & SCHEMA VALIDATION
    # ---------------------------------------------------------
    @staticmethod
    def _clean_text(text: str) -> str:
        """Aggressive cleanup of LLM artifacts (remove fenced blocks, markdown, basic HTML)."""
        if not text:
            return ""

        # Remove entire fenced blocks like ```json ... ``` (including language tag)
        text = re.sub(r"```(?:[^\n]*\n)?[\s\S]*?```", "", text)

        # Remove leftover fence markers if any
        text = text.replace("```", "")

        # Remove markdown bold/italic/backticks/quotes
        text = text.replace("**", "").replace("*", "").replace("`", "")

        # Remove simple HTML tags
        text = re.sub(r"<[^>]*>", "", text)

        # Normalize whitespace
        text = re.sub(r"\r\n", "\n", text)
        text = re.sub(r"\n{3,}", "\n\n", text)

        return text.strip()

    @staticmethod
    def _validate_resume_schema(data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Enforces schema for Resume Generation and returns a safe dict.
        If parsing failed, returns defaults.
        """
        defaults = {
            "resume_markdown": "# Resume\n\n(Content generation failed)",
            "suggestions": []
        }

        if not isinstance(data, dict):
            return defaults

        # Validate resume_markdown
        if "resume_markdown" not in data or not isinstance(data["resume_markdown"], str) or not data["resume_markdown"].strip():
            data["resume_markdown"] = defaults["resume_markdown"]

        # Validate suggestions
        if "suggestions" not in data or not isinstance(data["suggestions"], list):
            data["suggestions"] = []
        else:
            # Ensure list of strings
            sanitized = []
            for s in data["suggestions"]:
                try:
                    s_str = str(s).strip()
                    if s_str:
                        sanitized.append(s_str)
                except Exception:
                    continue
            data["suggestions"] = sanitized

        return data

    @staticmethod
    def _safe_parse_json(text: Optional[str]) -> Optional[Dict[str, Any]]:
        """
        Multi-strategy JSON parser:
         - Clean text
         - Try direct json.loads
         - Extract likely {...} blocks and try the largest one
         - Attempt small repairs (trailing commas)
        """
        if not text:
            return None

        cleaned = LLMEngine._clean_text(text)

        # Strategy A: direct parse
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass

        # Strategy B: find all {...} blocks and attempt parse on the largest
        candidates = []
        for m in re.finditer(r"\{[\s\S]*?\}", cleaned):
            candidates.append(m.group(0))

        # sort candidates by length (largest first)
        candidates.sort(key=lambda s: len(s), reverse=True)

        for candidate in candidates:
            # lightweight repairs: remove trailing commas before } or ]
            cand = re.sub(r",\s*}", "}", candidate)
            cand = re.sub(r",\s*]", "]", cand)
            try:
                return json.loads(cand)
            except json.JSONDecodeError:
                continue

        # last resort: try substring from first { to last }
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            candidate = cleaned[start:end+1]
            candidate = re.sub(r",\s*}", "}", candidate)
            candidate = re.sub(r",\s*]", "]", candidate)
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                pass

        logger.warning("Failed to parse JSON from cleaned LLM output.")
        return None

    # ---------------------------------------------------------
    # 3. DETERMINISTIC SYNTHESIS (V1 Logic Restored)
    # ---------------------------------------------------------
    @staticmethod
    def _enforce_word_limit(text: str) -> str:
        limit = CONFIG["DETERMINISTIC_WORD_LIMIT"]
        if not text:
            return ""
        parts = text.split()
        if len(parts) > limit:
            return " ".join(parts[:limit]).rstrip(".,;:") + "."
        return text

    @staticmethod
    def _synthesize_from_input(user_input: str) -> str:
        """
        Deterministic rewrite: verb mapping, pronoun removal, heuristics.
        """
        if not user_input or not user_input.strip():
            return "Built project."

        text = user_input.strip()
        lc = text.lower()

        verb_map = {
            "make": "Developed", "made": "Developed",
            "build": "Built", "built": "Built",
            "create": "Created", "created": "Created",
            "implement": "Implemented", "implemented": "Implemented",
            "write": "Authored", "wrote": "Authored",
            "fix": "Resolved", "fixed": "Resolved",
            "develop": "Developed", "developed": "Developed",
            "design": "Designed", "designed": "Designed",
            "deploy": "Deployed", "deployed": "Deployed",
            "engineer": "Engineered", "engineered": "Engineered",
            "launch": "Launched", "launched": "Launched",
            "automate": "Automated", "automated": "Automated",
            "use": "Utilized", "used": "Utilized"
        }

        # Remove pronouns
        lc = re.sub(r'^\s*(i am|i\'m|i|we|we\'re|we are|he|she)\s+', '', lc, flags=re.IGNORECASE).strip()

        # Verb detection
        m = re.match(r'^(?P<v>[a-z]+)\s+(?P<rest>.+)$', lc)
        chosen_verb = "Built"
        rest = lc

        if m:
            verb_word = m.group('v')
            rest = m.group('rest').strip()
            if verb_word in verb_map:
                chosen_verb = verb_map[verb_word]
            else:
                for k, v in verb_map.items():
                    if re.search(r'\b' + re.escape(k) + r'\b', lc):
                        chosen_verb = v
                        break

        # Article & grammar heuristics
        rest = re.sub(r'^\s*(a|an|the)\s+', '', rest, flags=re.IGNORECASE).strip()

        rest_words = rest.split()
        if len(rest_words) > 12:
            rest = " ".join(rest_words[:12])

        if rest:
            rest = rest[0].upper() + rest[1:] if rest[0].isalpha() else rest
            if re.match(r'^[A-Z]{2,}\b', rest):
                sentence = f"{chosen_verb} {rest}."
            elif re.match(r'^[AEIOUaeiou]', rest):
                sentence = f"{chosen_verb} an {rest}."
            else:
                sentence = f"{chosen_verb} a {rest}."
        else:
            sentence = f"{chosen_verb} project."

        sentence = re.sub(r'\s+', ' ', sentence).strip()
        sentence = sentence.replace("..", ".")
        if not sentence.endswith("."):
            sentence += "."

        return LLMEngine._enforce_word_limit(sentence)

    # ---------------------------------------------------------
    # 4. ROBUST NETWORK CALLER (Backoff + Jitter + Timeout for genai)
    # ---------------------------------------------------------
    @staticmethod
    def _genai_generate_with_timeout(full_prompt: str, timeout: int) -> Optional[Any]:
        """
        Execute genai model.generate_content with a timeout using ThreadPoolExecutor.
        Returns the model response object or raises exception on failure/timeout.
        """
        model = genai.GenerativeModel(CONFIG["GEMINI_MODEL"])

        def _call():
            return model.generate_content(full_prompt)

        with ThreadPoolExecutor(max_workers=1) as ex:
            fut = ex.submit(_call)
            try:
                return fut.result(timeout=timeout)
            except FuturesTimeoutError:
                fut.cancel()
                raise TimeoutError("Genai call timed out")
            except Exception:
                fut.cancel()
                raise

    @staticmethod
    def _call_llm(messages: List[Dict[str, str]], max_tokens: int = 512, temperature: float = 0.1) -> Optional[str]:
        """
        Executes LLM call with retries + exponential backoff + jitter.
        Returns cleaned string content OR None if all attempts fail.
        """
        start_time = time.time()

        # 1) Try Groq with retries
        if client:
            attempt = 0
            while attempt < CONFIG["MAX_RETRIES"]:
                try:
                    resp = client.chat.completions.create(
                        model=os.environ.get("GROQ_MODEL", "llama-3.1-8b-instant"),
                        messages=messages,
                        temperature=temperature,
                        max_tokens=max_tokens,
                        timeout=CONFIG["BASE_TIMEOUT"]
                    )
                    content = getattr(resp.choices[0].message, "content", None)
                    if content:
                        if CONFIG["LOG_LEVEL"] == "development":
                            logger.info("LLM Success (Groq) in %.2fs", time.time() - start_time)
                        return LLMEngine._clean_text(content)
                    # Treat empty content as an error to trigger retry
                    raise ValueError("Empty response from Groq")
                except Exception as e:
                    attempt += 1
                    # exponential backoff + jitter, clamp to 10s max
                    delay = min((1.5 ** attempt) + (random.random() * 0.5), 10.0)
                    logger.warning("Groq Attempt %d failed: %s. Retrying in %.2fs...", attempt, str(e), delay)
                    time.sleep(delay)

        # 2) Try Gemini (single attempt) with timeout wrapper
        if _gemini_key:
            try:
                # Build prompt from messages
                full_prompt = ""
                for m in messages:
                    role_prefix = "System: " if m.get("role") == "system" else "User: "
                    full_prompt += f"{role_prefix}{m.get('content', '')}\n\n"

                # Execute with timeout wrapper
                resp = LLMEngine._genai_generate_with_timeout(full_prompt, CONFIG["BASE_TIMEOUT"])
                # genai response may have .text attribute
                text_out = getattr(resp, "text", None) or (str(resp) if resp is not None else "")
                if text_out:
                    if CONFIG["LOG_LEVEL"] == "development":
                        logger.info("LLM Success (Gemini) in %.2fs", time.time() - start_time)
                    return LLMEngine._clean_text(text_out)
            except TimeoutError as te:
                logger.error("Gemini call timed out: %s", str(te))
            except Exception as e:
                exc_info = (CONFIG["LOG_LEVEL"] == "development")
                logger.error("Gemini Fallback Failed: %s", str(e), exc_info=exc_info)

        # All providers failed
        logger.error("All LLM providers failed after %.2fs", time.time() - start_time)
        return None

    # ---------------------------------------------------------
    # 5. PUBLIC API
    # ---------------------------------------------------------
    @staticmethod
    def generate_response(prompt: str, task_type: str = "chat", role: str = "General") -> str:
        """General purpose text generator."""
        # Input safety
        safe_prompt = LLMEngine._truncate_input(LLMEngine._redact_pii(prompt))

        # Deterministic path
        if task_type == "rewrite_project":
            return LLMEngine._synthesize_from_input(safe_prompt)

        # Environment check
        if not client and not _gemini_key:
            return "Demo Mode: AI Service Unavailable (No Keys)."

        # Set system prompt
        system_msg = f"You are a helpful assistant. Role: {role}"
        if task_type == "refine_bio":
            system_msg = "You are a Resume Editor. Reformat the bio to be professional, grammatically correct and confident. RULES: Max 40 words. NO markdown. NO explanations."
        elif task_type == "improve_experience":
            system_msg = "You are a Career Coach. Rewrite the input into a single powerful bullet point. RULES: Start with a strong Action Verb. Quantify results where possible. NO lists."
        elif task_type == "mock_interview":
            system_msg = f"You are a strict interviewer for a {role} role. Ask short, relevant questions."
        elif task_type == "reformat_description":
            system_msg = "You are a professional technical writer. Reformat the USER'S DESCRIPTION into a single clean formatted paragraph. Output ONLY the paragraph."

        messages = [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": f"Input: {safe_prompt}\nOutput:"}
        ]

        raw = LLMEngine._call_llm(messages, max_tokens=300)
        if raw is None:
            return "AI Service Unavailable. Please try again."

        return raw

    @staticmethod
    def generate_resume(profile_data: Dict[str, Any], job_description: str, style: str = "modern") -> Dict[str, Any]:
        """
        Generates full resume JSON. Returns Mock data on failure.
        """
        if not client and not _gemini_key:
            return LLMEngine._get_mock_resume()

        # Redact sensitive fields in profile_data (attempt structured redaction)
        try:
            # Prefer structured redaction: redact typical keys if present
            pd_copy = dict(profile_data) if isinstance(profile_data, dict) else {"profile": str(profile_data)}
            for k in ("email", "phone", "contact"):
                if k in pd_copy:
                    pd_copy[k] = "[REDACTED]"
            safe_profile_str = json.dumps(pd_copy, ensure_ascii=False)
        except Exception:
            safe_profile_str = "{}"

        system_msg = (
            "You are an expert Resume Writer. Output strictly valid JSON. "
            "Do NOT include markdown formatting or code fences."
        )

        prompt = f"""
REQUIRED STYLE: {style.upper()}
- If 'MODERN': Concise, metric-heavy, active voice.
- If 'PROFESSIONAL': Formal, traditional structure.

Task 1: Write a professional resume tailored to the JD.
Task 2: Provide 3 actionable tips.

USER PROFILE:
{safe_profile_str}

JOB DESCRIPTION:
{LLMEngine._truncate_input(job_description, max_chars=2000)}

OUTPUT SCHEMA (JSON ONLY):
{{
  "resume_markdown": "# Name...",
  "suggestions": ["Tip 1", "Tip 2", "Tip 3"]
}}
"""

        messages = [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": prompt}
        ]

        raw = LLMEngine._call_llm(messages, max_tokens=2500, temperature=0.3)
        if raw is None:
            logger.error("LLM providers failed for resume generation.")
            return LLMEngine._get_mock_resume()

        parsed = LLMEngine._safe_parse_json(raw)
        validated = LLMEngine._validate_resume_schema(parsed)

        # If we had to fall back to defaults, log diagnostic only if we had raw output
        if (parsed is None) and raw:
            logger.error("Resume parsing failed; returning validated defaults. Raw output length: %d", len(raw))

        return validated

    @staticmethod
    def _get_mock_resume() -> Dict[str, Any]:
        return {
            "resume_markdown": "# Mock Resume\n\nAI Service Unavailable. Please check your API Keys or Network.",
            "suggestions": ["Check backend logs.", "Ensure GROQ_API_KEY is set."]
        }
