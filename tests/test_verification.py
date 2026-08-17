import pytest
from fastapi.testclient import TestClient

from main import app
from app.database.seed import seed_database

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    seed_database()


def test_healthcheck():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_valid_verification_success():
    payload = {
        "patient_rfid": "RFID_PATIENT_001",
        "measured_weight_g": 0.51,  # Paracetamol reference: 0.50g, tolerance: 0.05g
        "measured_color": "white",
        "measured_shape": "oval",
        "epillid_class_id": "51285-0092-87_BE305F72",
    }
    response = client.post("/api/verifications", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "VERIFIED"
    assert data["patient_name"] == "John Doe"
    assert data["prescribed_medication"] == "Paracetamol 500mg"
    assert data["checks"]["patient_auth_passed"] is True
    assert data["checks"]["identity_check_passed"] is True
    assert data["checks"]["appearance_check_passed"] is True
    assert data["checks"]["weight_check_passed"] is True
    assert data["failure_reasons"] == []


def test_patient_not_authenticated():
    payload = {
        "patient_rfid": "UNKNOWN_RFID_999",
        "measured_weight_g": 0.50,
    }
    response = client.post("/api/verifications", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "REJECTED"
    assert "PATIENT_NOT_AUTHENTICATED" in data["failure_reasons"]
    assert data["checks"]["patient_auth_passed"] is False


def test_weight_mismatch():
    payload = {
        "patient_rfid": "RFID_PATIENT_001",
        "measured_weight_g": 0.85,  # Too heavy (ref 0.50g +/- 0.05g)
        "measured_color": "white",
        "measured_shape": "oval",
    }
    response = client.post("/api/verifications", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "REJECTED"
    assert "WEIGHT_MISMATCH" in data["failure_reasons"]
    assert data["checks"]["patient_auth_passed"] is True
    assert data["checks"]["weight_check_passed"] is False


def test_appearance_mismatch():
    payload = {
        "patient_rfid": "RFID_PATIENT_001",
        "measured_weight_g": 0.50,
        "measured_color": "blue",  # Wrong color (expected white)
        "measured_shape": "round",  # Wrong shape (expected oval)
    }
    response = client.post("/api/verifications", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "REJECTED"
    assert "APPEARANCE_MISMATCH" in data["failure_reasons"]
    assert data["checks"]["appearance_check_passed"] is False


def test_get_verification_history():
    # Perform two verifications
    test_valid_verification_success()
    test_weight_mismatch()

    response = client.get("/api/verifications")
    assert response.status_code == 200
    history = response.json()
    assert len(history) >= 2
    assert history[0]["status"] in ["VERIFIED", "REJECTED"]
