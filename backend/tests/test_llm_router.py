# backend/tests/test_llm_router.py
from unittest.mock import patch
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_mock_v3_handles_llm_exception_and_falls_back():
    # Simulate LLM that raises exception (network / key error)
    class ExplodingLLM:
        @staticmethod
        def generate_response(*args, **kwargs):
            raise RuntimeError("LLM network error")

    with patch("backend.services.llm_engine.client", ExplodingLLM):
        # Start endpoint must still return success (fallback to deterministic)
        resp = client.post("/mock-v3/start", json={"role": "frontend"})
        assert resp.status_code == 200
        j = resp.json()
        assert j["status"] == "success"
        assert "session_id" in j["data"]

        sid = j["data"]["session_id"]

        # Submitting an answer should not 500 even if LLM not available
        resp2 = client.post("/mock-v3/submit-answer", json={"session_id": sid, "answer": "test"})
        assert resp2.status_code == 200
        j2 = resp2.json()
        assert j2["status"] == "success"
        # must include evaluation dict (fallback or deterministic)
        assert isinstance(j2["data"].get("evaluation"), dict)

def test_mock_v3_rejects_empty_llm_output_and_uses_fallback():
    class EmptyLLM:
        @staticmethod
        def generate_response(*args, **kwargs):
            return ""  # empty / junk

    with patch("backend.services.llm_engine.client", EmptyLLM):
        resp = client.post("/mock-v3/start", json={"role": "frontend"})
        assert resp.status_code == 200
        j = resp.json()
        assert j["status"] == "success"
        # If LLM output empty, the router should still provide a valid question via fallback
        assert j["data"].get("question")
        assert isinstance(j["data"]["session_id"], str)
