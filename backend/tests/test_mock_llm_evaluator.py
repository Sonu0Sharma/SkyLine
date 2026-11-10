import pytest
from unittest.mock import patch

import backend.services.mock.llm_evaluator as llm_eval


# -------------------------------
# Helpers
# -------------------------------
def _fake_deterministic_question(*args, **kwargs):
    return {"question": "What is polymorphism?"}


def _fake_deterministic_eval(answer, role):
    return {
        "score": 42,
        "feedback": "Good attempt.",
        "strengths": ["clear"],
        "weaknesses": ["short"],
    }


# -------------------------------
# ask_question tests
# -------------------------------
def test_ask_question_fallback_when_no_llm():
    with patch.object(llm_eval, "LLM_ENGINE", None):
        with patch.object(llm_eval, "deterministic_get_question", _fake_deterministic_question):
            resp = llm_eval.ask_question(role="frontend")
            assert isinstance(resp, dict)
            assert "text" in resp
            assert resp["text"] == "What is polymorphism?"
            assert resp["provider"] == "fallback"


def test_ask_question_llm_returns_empty_triggers_fallback():
    class FakeLLM:
        @staticmethod
        def generate_response(*args, **kwargs):
            return ""  # empty invalid output

    with patch.object(llm_eval, "LLM_ENGINE", FakeLLM):
        with patch.object(llm_eval, "deterministic_get_question", _fake_deterministic_question):
            resp = llm_eval.ask_question(role="frontend")
            assert resp["provider"] == "fallback"
            assert "polymorphism" in resp["text"].lower()


def test_ask_question_llm_success():
    class FakeLLM:
        @staticmethod
        def generate_response(*args, **kwargs):
            return "What is a closure in JavaScript?"

    with patch.object(llm_eval, "LLM_ENGINE", FakeLLM):
        resp = llm_eval.ask_question(role="frontend")
        assert resp["provider"] == "llm"
        assert "closure" in resp["text"].lower()


# -------------------------------
# evaluate_answer tests
# -------------------------------
def test_evaluate_answer_missing():
    resp = llm_eval.evaluate_answer("", role="frontend")
    assert resp["ok"] is False
    assert resp["provider"] == "none"
    assert "evaluation" in resp


def test_evaluate_answer_det_fallback():
    with patch.object(llm_eval, "LLM_ENGINE", None):
        with patch.object(llm_eval, "deterministic_evaluate_answer", _fake_deterministic_eval):
            resp = llm_eval.evaluate_answer("hello", role="frontend")
            assert resp["ok"] is True
            assert resp["provider"] == "deterministic"
            assert resp["evaluation"]["score"] == 42
            assert resp["evaluation"]["feedback"] == "Good attempt."


def test_evaluate_answer_llm_parsing_failure_fallback():
    # LLM returns garbage → fallback
    class FakeLLM:
        @staticmethod
        def generate_response(*args, **kwargs):
            return "nonsense!!! no score here"

    with patch.object(llm_eval, "LLM_ENGINE", FakeLLM):
        with patch.object(llm_eval, "deterministic_evaluate_answer", _fake_deterministic_eval):
            resp = llm_eval.evaluate_answer("hello", "frontend")
            assert resp["provider"] == "deterministic"
            assert resp["evaluation"]["score"] == 42


def test_evaluate_answer_llm_success():
    class FakeLLM:
        @staticmethod
        def generate_response(*args, **kwargs):
            return """
            Score: 88
            Strengths:
            1. Clear
            2. Structured
            Weaknesses:
            1. Needs examples
            Feedback: Good answer.
            """

    with patch.object(llm_eval, "LLM_ENGINE", FakeLLM):
        resp = llm_eval.evaluate_answer("Hello", "frontend")
        assert resp["provider"] == "llm"
        assert resp["evaluation"]["score"] == 88
        assert "clear" in resp["evaluation"]["strengths"][0].lower()
