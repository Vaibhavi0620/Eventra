"""
EVENTRA — Automated Pytest Suite for AI/ML Suspicious Activity Detection
Tests:
  - Training reproducibility
  - Evaluation metrics integrity (not fabricated)
  - Prediction endpoint for NORMAL and SUSPICIOUS archetypes
  - Invalid input handling (422 validation errors)
"""

from fastapi.testclient import TestClient
from app import app
from train_model import train_and_evaluate

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["model_loaded"] is True


def test_training_reproducibility_and_metrics():
    m1 = train_and_evaluate()
    m2 = train_and_evaluate()
    assert m1["accuracy"] == m2["accuracy"]
    assert m1["f1_score"] == m2["f1_score"]
    assert m1["confusion_matrix"]["matrix"] == m2["confusion_matrix"]["matrix"]
    assert 0.70 <= m1["accuracy"] <= 0.99


def test_predict_normal_fan():
    payload = {
        "wallet_id": "0x111122223333",
        "event_id": "EVT-SONIC-01",
        "event_category": "ELECTRONIC",
        "tickets_bought": 1,
        "transfers": 0,
        "resales": 0,
        "time_diff": 7200.0,
        "resale_price": 1000.0,
        "original_price": 1000.0,
        "transaction_frequency": 0.5,
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["predicted_label"] == "NORMAL"
    assert 0.0 <= data["risk_score"] < 0.50
    assert len(data["reasons"]) >= 1


def test_predict_suspicious_scalper():
    payload = {
        "wallet_id": "0x999988887777",
        "event_id": "EVT-PULSE-02",
        "event_category": "FESTIVAL",
        "tickets_bought": 8,
        "transfers": 5,
        "resales": 4,
        "time_diff": 35.0,
        "resale_price": 2950.0,
        "original_price": 2500.0,
        "transaction_frequency": 12.5,
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["predicted_label"] == "SUSPICIOUS"
    assert data["risk_score"] >= 0.50
    assert any("accumulation" in r.lower() or "resale" in r.lower() for r in data["reasons"])


def test_invalid_input_handling():
    # Negative tickets_bought and zero original_price should fail Pydantic validation
    bad_payload = {
        "tickets_bought": 0,
        "transfers": -1,
        "resales": 0,
        "time_diff": 100.0,
        "resale_price": 1000.0,
        "original_price": 0.0,
        "transaction_frequency": 1.0,
    }
    response = client.post("/predict", json=bad_payload)
    assert response.status_code == 422
