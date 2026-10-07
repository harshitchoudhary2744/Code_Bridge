"""
API Integration tests using FastAPI TestClient.
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "supported_languages" in data


def test_languages_endpoint():
    response = client.get("/api/languages")
    assert response.status_code == 200
    data = response.json()
    assert "python" in data["languages"]
    assert "java" in data["languages"]


def test_analyze_structure_endpoint():
    response = client.post("/api/analyze-structure", json={
        "language": "python",
        "code": "def hello(): return 'world'"
    })
    assert response.status_code == 200
    data = response.json()
    assert "FUNCTION" in data["structure"]


def test_validate_endpoint():
    response = client.post("/api/validate", json={
        "language": "python",
        "code": "def add(a, b): return a + b",
        "tests": [{"function": "add", "inputs": [1, 2], "expected": 3}]
    })
    assert response.status_code == 200
    data = response.json()
    assert data["syntax"] is True
    assert data["tests_passed"] == 1


def test_translate_endpoint_validation():
    # Test same language error
    response = client.post("/api/translate", json={
        "source_language": "python",
        "target_language": "python",
        "code": "x = 1"
    })
    assert response.status_code == 400

    # Test empty code error
    response = client.post("/api/translate", json={
        "source_language": "python",
        "target_language": "java",
        "code": ""
    })
    assert response.status_code == 400
