"""Tests for the Counter API (P15) — OTP flow, safety flags, consent enforcement."""

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.db.session import engine
from app.domain.models import Consent, MasterPatient
from app.main import app

client = TestClient(app)

PHARMACIST_TOKEN: str = ""
DOCTOR_TOKEN: str = ""
PRIYA_CLID: str = ""


def _login(username: str, password: str = "carelens-demo") -> str:
    resp = client.post("/auth/login", json={"username": username, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def setup_module(_module: object) -> None:
    global PHARMACIST_TOKEN, DOCTOR_TOKEN, PRIYA_CLID
    PHARMACIST_TOKEN = _login("pharm.imran")
    DOCTOR_TOKEN = _login("dr.rao")
    with Session(engine) as session:
        patients = session.exec(select(MasterPatient)).all()
        for p in patients:
            if p.name and "Priya Nair" in p.name:
                PRIYA_CLID = p.clid
                break


# ── OTP request ────────────────────────────────────────────────────────────────


def test_otp_request_pharmacist_ok():
    """Pharmacist can request OTP for a known phone number."""
    resp = client.post(
        "/counter/otp/request",
        json={"phone": "90000 55001"},
        headers={"Authorization": f"Bearer {PHARMACIST_TOKEN}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["simulated"] is True
    assert len(data["otp_code"]) == 6


def test_otp_request_doctor_denied():
    """Non-pharmacist cannot request counter OTP."""
    resp = client.post(
        "/counter/otp/request",
        json={"phone": "90000 55001"},
        headers={"Authorization": f"Bearer {DOCTOR_TOKEN}"},
    )
    assert resp.status_code == 403


def test_otp_request_invalid_phone():
    resp = client.post(
        "/counter/otp/request",
        json={"phone": ""},
        headers={"Authorization": f"Bearer {PHARMACIST_TOKEN}"},
    )
    assert resp.status_code == 400


# ── OTP confirm ────────────────────────────────────────────────────────────────


def test_otp_full_flow():
    """Request OTP then confirm it — creates 24h counter consent."""
    if not PRIYA_CLID:
        pytest.skip("Priya Nair not found in test DB")

    # 1. Request OTP
    req_resp = client.post(
        "/counter/otp/request",
        json={"phone": "90000 55001"},
        headers={"Authorization": f"Bearer {PHARMACIST_TOKEN}"},
    )
    assert req_resp.status_code == 200
    otp = req_resp.json()["otp_code"]

    # 2. Confirm OTP
    conf_resp = client.post(
        "/counter/otp/confirm",
        json={"clid": PRIYA_CLID, "otp_code": otp},
        headers={"Authorization": f"Bearer {PHARMACIST_TOKEN}"},
    )
    assert conf_resp.status_code == 200
    data = conf_resp.json()
    assert data["consent_group"] == "counter"
    assert data["purpose"] == "counter_check"

    # 3. Verify consent exists in DB
    with Session(engine) as session:
        consent = session.exec(
            select(Consent).where(
                Consent.clid == PRIYA_CLID,
                Consent.group == "counter",
                Consent.status == "active",
            )
        ).first()
        assert consent is not None


def test_otp_wrong_code_denied():
    """Wrong OTP code returns 400."""
    if not PRIYA_CLID:
        pytest.skip("Priya Nair not found in test DB")

    # Request OTP
    client.post(
        "/counter/otp/request",
        json={"phone": "90000 55001"},
        headers={"Authorization": f"Bearer {PHARMACIST_TOKEN}"},
    )

    resp = client.post(
        "/counter/otp/confirm",
        json={"clid": PRIYA_CLID, "otp_code": "000000"},
        headers={"Authorization": f"Bearer {PHARMACIST_TOKEN}"},
    )
    assert resp.status_code == 400


# ── Safety check ───────────────────────────────────────────────────────────────


def test_safety_check_requires_consent():
    """Safety check fails without active counter consent for a different patient."""
    if not PRIYA_CLID:
        pytest.skip("Priya Nair not found in test DB")

    with Session(engine) as session:
        # Find a patient that definitely has no counter consent
        patients = session.exec(select(MasterPatient)).all()
        no_consent_clid = None
        from datetime import datetime, timezone

        for p in patients:
            if p.clid == PRIYA_CLID:
                continue
            existing = session.exec(
                select(Consent).where(
                    Consent.clid == p.clid,
                    Consent.group == "counter",
                    Consent.status == "active",
                    Consent.valid_to > datetime.now(timezone.utc),
                )
            ).first()
            if not existing:
                no_consent_clid = p.clid
                break

    if not no_consent_clid:
        pytest.skip("Could not find patient without counter consent")

    resp = client.get(
        f"/counter/{no_consent_clid}/safety",
        headers={"Authorization": f"Bearer {PHARMACIST_TOKEN}"},
    )
    assert resp.status_code == 403


def test_safety_check_allergy_conflict():
    """Safety check detects allergy conflict for Priya Nair (penicillin + Augmentin)."""
    if not PRIYA_CLID:
        pytest.skip("Priya Nair not found in test DB")

    # Ensure counter consent exists (use OTP flow)
    req_resp = client.post(
        "/counter/otp/request",
        json={"phone": "90000 55001"},
        headers={"Authorization": f"Bearer {PHARMACIST_TOKEN}"},
    )
    if req_resp.status_code == 200:
        otp = req_resp.json()["otp_code"]
        client.post(
            "/counter/otp/confirm",
            json={"clid": PRIYA_CLID, "otp_code": otp},
            headers={"Authorization": f"Bearer {PHARMACIST_TOKEN}"},
        )

    resp = client.get(
        f"/counter/{PRIYA_CLID}/safety",
        headers={"Authorization": f"Bearer {PHARMACIST_TOKEN}"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["consent_verified"] is True
    flag_types = [f["flag"] for f in data["flags"]]
    # Priya has penicillin allergy and Augmentin (penicillin class) dispensed
    assert "allergy_conflict" in flag_types
    assert data["critical_count"] >= 1


def test_safety_check_non_pharmacist_denied():
    """Doctor cannot access counter safety check."""
    if not PRIYA_CLID:
        pytest.skip("Priya Nair not found in test DB")
    resp = client.get(
        f"/counter/{PRIYA_CLID}/safety",
        headers={"Authorization": f"Bearer {DOCTOR_TOKEN}"},
    )
    assert resp.status_code == 403
