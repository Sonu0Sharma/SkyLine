# backend/tests/test_profile_resumes_list.py
"""
Ensures that GET /profile/resumes ALWAYS returns a JSON array (list),
never a plain dict, never null.

This test protects the frontend from shape mismatches.
"""

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_resumes_return_list():
    """Basic test: endpoint must return a JSON list."""
    resp = client.get("/profile/resumes")
    assert resp.status_code == 200

    data = resp.json()
    assert isinstance(data, list), f"/profile/resumes should return a list, got: {type(data)}"

    # If list has elements, they should be dicts
    if len(data) > 0:
        assert isinstance(data[0], dict), "Items in resumes list must be JSON objects (dicts)"


def test_resumes_empty_list_valid():
    """Empty list must be allowed and valid."""
    resp = client.get("/profile/resumes")
    assert resp.status_code == 200

    data = resp.json()
    assert data is not None, "Response should not be null"
    assert isinstance(data, list), "Response must be a list even if empty"


def test_resumes_multiple_calls_consistent():
    """
    Repeated calls should consistently return a list.
    This catches race conditions or serialization issues.
    """
    for _ in range(3):
        resp = client.get("/profile/resumes")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list), "Response shape must remain a list"
