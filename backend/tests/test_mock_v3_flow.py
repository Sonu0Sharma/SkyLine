# backend/tests/test_mock_v3_flow.py
import os
import importlib
import time
from fastapi.testclient import TestClient

# Helper to (re)load the FastAPI app after changing env keys
def get_app_with_env(groq_key=None, gemini_key=None):
    """
    Set environment keys, reload llm_engine and main modules, and return app.
    groq_key/gemini_key may be None (leave as-is), empty-string (disable), or value (enable).
    """
    # Set/unset environment variables as requested
    if groq_key is not None:
        if groq_key == "":
            os.environ.pop("GROQ_API_KEY", None)
            os.environ["GROQ_API_KEY"] = ""
        else:
            os.environ["GROQ_API_KEY"] = groq_key

    if gemini_key is not None:
        if gemini_key == "":
            os.environ.pop("GEMINI_API_KEY", None)
            os.environ["GEMINI_API_KEY"] = ""
        else:
            os.environ["GEMINI_API_KEY"] = gemini_key

    # Reload the llm engine module so it picks up env changes
    try:
        import backend.services.llm_engine as llm_engine_mod
        importlib.reload(llm_engine_mod)
    except Exception:
        # If reload fails, continue — tests will still run against whatever app is loaded
        pass

    # Reload main so routers pick up the reloaded modules (best-effort)
    try:
        import backend.main as main_mod
        importlib.reload(main_mod)
        app = main_mod.app
    except Exception:
        # Fallback: import app the normal way
        from backend.main import app  # type: ignore
    return app

def run_mock_v3_flow(client: TestClient):
    """
    Runs a single session lifecycle:
      start -> submit-answer -> submit-answer -> results
    Asserts basic structure and returns the final results response JSON.
    """
    # 1) Start session
    start_payload = {"role": "frontend", "difficulty": "Medium", "question_count": 3}
    r = client.post("/mock-v3/start", json=start_payload)
    assert r.status_code == 200, f"start failed: {r.status_code} {r.text}"
    j = r.json()
    assert j.get("status") == "success"
    data = j["data"]
    assert "session_id" in data and data["session_id"], "start didn't return session_id"
    session_id = data["session_id"]

    # 2) Submit a short answer (first)
    ans1 = {
        "session_id": session_id,
        "answer": "Flexbox is for 1D layouts; Grid is for 2D layouts."
    }
    r2 = client.post("/mock-v3/submit-answer", json=ans1)
    assert r2.status_code == 200, f"submit-answer 1 failed: {r2.status_code} {r2.text}"
    j2 = r2.json()
    assert j2.get("status") == "success"
    # basic structure checks
    d2 = j2["data"]
    assert "evaluation" in d2 and isinstance(d2["evaluation"], dict)

    # 3) Submit a second answer (follow-up)
    ans2 = {
        "session_id": session_id,
        "answer": "I led a UI refactor improving load times by 20%."
    }
    r3 = client.post("/mock-v3/submit-answer", json=ans2)
    assert r3.status_code == 200, f"submit-answer 2 failed: {r3.status_code} {r3.text}"
    j3 = r3.json()
    assert j3.get("status") == "success"
    assert "evaluation" in j3["data"]

    # 4) Fetch results
    r4 = client.get(f"/mock-v3/{session_id}/results")
    assert r4.status_code == 200, f"results failed: {r4.status_code} {r4.text}"
    j4 = r4.json()
    assert j4.get("status") == "success"
    final = j4["data"]
    # Results sanity checks
    assert "transcript" in final and isinstance(final["transcript"], list)
    assert "llm_summary" in final
    return final

def test_mock_v3_lifecycle_with_llm_enabled():
    """
    Runs the lifecycle with the environment as-is (LLM enabled if keys are present).
    This checks the typical end-to-end flow.
    """
    app = get_app_with_env()  # do not change env — use whatever is in the process already
    client = TestClient(app)
    final = run_mock_v3_flow(client)
    # Basic assertions about the transcript content
    assert len(final["transcript"]) >= 1
    # overall_score may be None in some configurations; just ensure field exists
    assert "overall_score" in final

def test_mock_v3_lifecycle_with_llm_disabled(monkeypatch):
    """
    Force LLM keys to disabled (empty), reload engine, and run lifecycle.
    This exercises the deterministic/fallback path.
    """
    # Temporarily set env to empty strings to simulate missing API keys
    monkeypatch.setenv("GROQ_API_KEY", "")
    monkeypatch.setenv("GEMINI_API_KEY", "")

    # Reload app with environment toggled
    app = get_app_with_env(groq_key="", gemini_key="")
    client = TestClient(app)

    final = run_mock_v3_flow(client)
    # With LLM disabled we still expect a transcript and results structure
    assert isinstance(final.get("transcript"), list)
    assert "llm_summary" in final
