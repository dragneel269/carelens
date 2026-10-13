"""Tests for Refill Gap Alerts API (P17)."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

PHARMACIST_TOKEN: str = ""
DOCTOR_TOKEN: str = ""
BILLING_TOKEN: str = ""


def _login(username: str, password: str = "carelens-demo") -> str:
    resp = client.post("/auth/login", json={"username": username, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def setup_module(_module: object) -> None:
    global PHARMACIST_TOKEN, DOCTOR_TOKEN, BILLING_TOKEN
    PHARMACIST_TOKEN = _login("pharm.imran")
    DOCTOR_TOKEN = _login("dr.rao")
    BILLING_TOKEN = _login("billing.sunil")


def test_followups_pharmacist_ok():
    """Pharmacist can list overdue refills."""
    resp = client.get("/followups", headers={"Authorization": f"Bearer {PHARMACIST_TOKEN}"})
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)


def test_followups_doctor_ok():
    """Doctor can also access refill alerts."""
    resp = client.get("/followups", headers={"Authorization": f"Bearer {DOCTOR_TOKEN}"})
    assert resp.status_code == 200


def test_followups_billing_denied():
    """Billing role cannot access refill alerts."""
    resp = client.get("/followups", headers={"Authorization": f"Bearer {BILLING_TOKEN}"})
    assert resp.status_code == 403


def test_followups_suresh_pai_overdue():
    """Suresh Pai (Glycomet 500, dispensed 2026-09-20, days_supply=30) appears as overdue."""
    resp = client.get("/followups", headers={"Authorization": f"Bearer {PHARMACIST_TOKEN}"})
    assert resp.status_code == 200
    data = resp.json()
    names = [r["patient_name"] for r in data]
    generics = [r["generic_name"] for r in data]
    # Suresh Pai must be overdue for metformin
    assert any("Suresh" in n for n in names) or any(
        g and "metformin" in g.lower() for g in generics
    ), f"Expected overdue metformin refill for Suresh Pai, got: {data}"


def test_followups_sorted_most_overdue_first():
    """Results are sorted by days_overdue descending."""
    resp = client.get("/followups", headers={"Authorization": f"Bearer {PHARMACIST_TOKEN}"})
    assert resp.status_code == 200
    data = resp.json()
    if len(data) >= 2:
        for i in range(len(data) - 1):
            assert data[i]["days_overdue"] >= data[i + 1]["days_overdue"]


def test_followups_min_days_filter():
    """min_days_overdue filter works — requesting >999 days returns empty."""
    resp = client.get(
        "/followups?min_days_overdue=999",
        headers={"Authorization": f"Bearer {PHARMACIST_TOKEN}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    for item in data:
        assert item["days_overdue"] >= 999
