# backend/tests/test_mock_v3_endpoints.py
from unittest.mock import patch
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


class FakeLLM:
    @staticmethod
    def generate_response(prompt: str, task_type: str = "chat", role: str = "General"):
        # Return a deterministic question when start called
        if task_type == "mock_interview":
            return "Question: Explain event delegation in JavaScript."
        # Return deterministic evaluation when evaluating answers
        if task_type == "evaluate_answer":
            # This format may be parsed by the router/evaluator, but tests only assert presence
            return "Score: 75\nFeedback: Good answer. Add more examples."
        return "OK"


def test_mock_v3_llm_flow_with_fake_llm():
    # Ensure endpoints work even if we provide a fake LLM engine
    with patch("backend.services.llm_engine.client", FakeLLM):
        # Start session (should use LLM)
        resp = client.post("/mock-v3/start", json={
            "role": "frontend",
            "difficulty": "Medium",
            "question_count": 2
        })
        assert resp.status_code == 200
        j = resp.json()
        assert j["status"] == "success"
        sid = j["data"]["session_id"]
        assert isinstance(sid, str)
        assert "question" in j["data"]

        # Submit an answer and expect evaluation structure
        resp2 = client.post("/mock-v3/submit-answer", json={
            "session_id": sid,
            "answer": "Event delegation uses a single handler on a parent element."
        })
        assert resp2.status_code == 200
        j2 = resp2.json()
        assert j2["status"] == "success"
        evaluation = j2["data"].get("evaluation")
        assert isinstance(evaluation, dict)
        assert "score" in evaluation or "feedback" in evaluation

        # Fetch results (should be present and include transcript)
        resp3 = client.get(f"/mock-v3/{sid}/results")
        assert resp3.status_code == 200
        j3 = resp3.json()
        assert j3["status"] == "success"
        assert "data" in j3
        assert "transcript" in j3["data"]
