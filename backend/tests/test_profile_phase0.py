from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_profile_creation():
    # 1. Update Profile
    payload = {
        "full_name": "Phase 0 User",
        "email": "user@example.com",
        "experience": [
            {
                "title": "Developer",
                "company": "Test Corp",
                "start_date": "2023",
                "description": "Backend logic"
            }
        ],
        "education": [],
        "projects": []
    }
    response = client.post("/profile/", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Phase 0 User"
    assert data["experience"][0]["company"] == "Test Corp"

def test_get_profile():
    response = client.get("/profile/")
    assert response.status_code == 200
    assert response.json()["full_name"] == "Phase 0 User"