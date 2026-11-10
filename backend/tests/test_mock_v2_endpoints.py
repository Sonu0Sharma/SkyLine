# backend/tests/test_mock_v2_endpoints.py
import json
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_mock_v2_full_flow():
    # 1) Start session
    resp = client.post("/mock-v2/start-session", json={
        "target_role": "Frontend Developer",
        "difficulty": "Easy",
        "question_count": 2
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("status") == "success"
    sid = data["data"]["session_id"]
    assert isinstance(sid, str)
    assert "question" in data["data"]

    # 2) Submit first answer (should accept and return evaluation)
    resp2 = client.post("/mock-v2/submit-answer", json={
        "session_id": sid,
        "answer": "This is a short mock answer for testing."
    })
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2.get("status") == "success"
    evaluation = data2["data"].get("evaluation")
    assert isinstance(evaluation, dict)
    assert "score" in evaluation
    assert "feedback" in evaluation

    # 3) Call next for the session to fetch next question (or complete)
    resp3 = client.post(f"/mock-v2/{sid}/next")
    # next can return next question or completed status; ensure no 404/500
    assert resp3.status_code in (200, 201)
    # Accept both shapes: completed or question object
    j3 = resp3.json()
    assert isinstance(j3, dict)

    # 4) Finish session (end) - ensure endpoint exists and is callable
    resp4 = client.post(f"/mock-v2/{sid}/end")
    assert resp4.status_code in (200, 201)

    # 5) Get results
    resp5 = client.get(f"/mock-v2/{sid}/results")
    assert resp5.status_code == 200
    j5 = resp5.json()
    assert j5.get("status") == "success"
    # Basic structure expected
    assert "data" in j5
    assert "transcript" in j5["data"] or "overall_score" in j5["data"]
