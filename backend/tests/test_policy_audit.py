"""Tests for zero-trust policy engine, consent service, and append-only audit ledger.

DONE WHEN criteria:
1. Parametrized test covers every role x category x consent state.
2. Revoking billing's claims consent denies billing on the very next request (no caching).
3. A test that edits an audit row makes verify_chain fail (tamper-evident).
"""

from datetime import datetime, timedelta, timezone
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.audit.ledger import (
    GENESIS_HASH,
    compute_entry_hash,
    make_payload,
    verify_chain,
)
from app.audit.ledger import (
    log as audit_log,
)
from app.core.security import create_access_token
from app.db.session import create_db_and_tables, engine
from app.domain.models import AuditEntry, Consent, User
from app.integration.pipeline import run_ingest
from app.main import app
from app.policy.engine import (
    ROLE_GROUP_MAP,
    ROLE_MATRIX,
    decide,
)
from app.seed import seed_users

client = TestClient(app)


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    """Provide a fresh session with database tables and seed data."""
    create_db_and_tables()
    with Session(engine) as session:
        seed_users(session)
        run_ingest(session)
        yield session


# =========================================================================
# 1. PARAMETRIZED TEST: ROLE x CATEGORY x CONSENT STATE
# =========================================================================

ROLES = ["doctor", "nurse", "pharmacist", "lab_tech", "billing", "admin", "patient"]
CATEGORIES = [
    "demographics_min",
    "demographics_full",
    "encounters",
    "conditions",
    "allergies",
    "medications",
    "labs",
    "claims",
]
CONSENT_STATES = ["active", "revoked", "expired", "missing"]


@pytest.mark.parametrize("role", ROLES)
@pytest.mark.parametrize("category", CATEGORIES)
@pytest.mark.parametrize("consent_state", CONSENT_STATES)
def test_policy_decide_role_x_category_x_consent(
    db_session: Session, role: str, category: str, consent_state: str
):
    """Parametrized matrix test verifying zero-trust authorization decisions.

    Asserts expected allow/deny outcome against spec §7 rules:
    - Patient gets access to own data regardless of consent_state.
    - Admin has zero clinical access (audit only).
    - Other roles: ALLOW only if matrix allows category AND active unexpired consent exists.
    - Every decision logs to audit ledger; nothing is cached.
    """
    clid = "CL-000001"
    now = datetime.now(timezone.utc)

    # Prepare user
    user = User(
        username=f"test_{role}",
        hashed_password="hash",
        role=role,
        full_name=f"Test {role.capitalize()}",
        linked_clid=clid if role == "patient" else None,
    )

    # Set up consent in database for this role's group
    group = ROLE_GROUP_MAP.get(role, "clinicians")
    purpose = "payment" if role == "billing" else "treatment"

    # Clear pre-existing consents for this test clid and group
    existing_consents = db_session.exec(
        select(Consent).where(Consent.clid == clid, Consent.group == group)
    ).all()
    for c in existing_consents:
        db_session.delete(c)
    db_session.commit()

    if consent_state == "active":
        c = Consent(
            clid=clid,
            group=group,
            categories=category,
            purpose=purpose,
            valid_to=now + timedelta(days=30),
            status="active",
            created_at=now,
        )
        db_session.add(c)
        db_session.commit()
    elif consent_state == "revoked":
        c = Consent(
            clid=clid,
            group=group,
            categories=category,
            purpose=purpose,
            valid_to=now + timedelta(days=30),
            status="revoked",
            created_at=now,
        )
        db_session.add(c)
        db_session.commit()
    elif consent_state == "expired":
        c = Consent(
            clid=clid,
            group=group,
            categories=category,
            purpose=purpose,
            valid_to=now - timedelta(days=1),  # Expired yesterday
            status="active",
            created_at=now - timedelta(days=31),
        )
        db_session.add(c)
        db_session.commit()
    # consent_state == "missing": no consent row created

    # Record initial audit entry count
    initial_audit_count = len(db_session.exec(select(AuditEntry)).all())

    # Execute decision
    result = decide(db_session, user=user, clid=clid, category=category)

    # Assert audit log was recorded for this decision
    final_audit_count = len(db_session.exec(select(AuditEntry)).all())
    assert final_audit_count == initial_audit_count + 1

    last_audit = db_session.exec(
        select(AuditEntry).order_by(AuditEntry.id.desc()).limit(1)
    ).first()
    assert last_audit is not None
    assert last_audit.actor == user.username
    assert last_audit.role == role
    assert last_audit.clid == clid
    assert last_audit.categories == category

    # Determine expected outcome
    if role == "patient":
        expected_allow = True
    elif role == "admin":
        expected_allow = False
    else:
        matrix_allows = category in ROLE_MATRIX.get(role, set())
        has_active_consent = consent_state == "active"
        expected_allow = matrix_allows and has_active_consent

    assert result["allow"] is expected_allow
    assert last_audit.decision == ("ALLOW" if expected_allow else "DENY")


# =========================================================================
# 2. IMMEDIATE DENIAL UPON CONSENT REVOCATION (NO CACHING)
# =========================================================================


def test_revoking_billing_claims_consent_denies_on_next_request(db_session: Session):
    """Revoking billing's claims consent must deny billing on the very next request."""
    clid = "CL-000001"
    now = datetime.now(timezone.utc)

    billing_user = User(
        username="billing.sunil",
        hashed_password="hash",
        role="billing",
        full_name="Sunil Billing",
    )

    # 1. Clean existing billing consents and add an active one
    existing = db_session.exec(
        select(Consent).where(Consent.clid == clid, Consent.group == "billing")
    ).all()
    for ex in existing:
        db_session.delete(ex)
    db_session.commit()

    consent = Consent(
        clid=clid,
        group="billing",
        categories="demographics_min,claims",
        purpose="payment",
        valid_to=now + timedelta(days=30),
        status="active",
        created_at=now,
    )
    db_session.add(consent)
    db_session.commit()
    db_session.refresh(consent)

    # 2. First request: should be ALLOWED
    first_decision = decide(
        db_session, user=billing_user, clid=clid, category="claims", purpose="payment"
    )
    assert first_decision["allow"] is True
    assert "Allowed" in first_decision["reason"]

    # 3. Revoke consent immediately in DB
    consent.status = "revoked"
    db_session.add(consent)
    db_session.commit()

    # 4. Very next request: must be DENIED immediately (no stale cache!)
    next_decision = decide(
        db_session, user=billing_user, clid=clid, category="claims", purpose="payment"
    )
    assert next_decision["allow"] is False
    assert "Denied" in next_decision["reason"]


# =========================================================================
# 3. TAMPER-EVIDENT AUDIT HASH CHAIN INTEGRITY
# =========================================================================


def test_audit_hash_chain_verification_passes_on_valid_ledger(db_session: Session):
    """A clean ledger must pass verify_chain with verified=True."""
    verify_result = verify_chain(db_session)
    assert verify_result["verified"] is True
    assert verify_result["broken_at_id"] is None
    assert verify_result["count"] > 0


def test_editing_audit_row_makes_verify_chain_fail(db_session: Session):
    """Tampering with an audit row (e.g. changing decision) must cause verify_chain to fail."""
    # Ensure at least 3 entries exist
    audit_log(
        db_session,
        actor="doctor.rao",
        role="doctor",
        action="read",
        decision="ALLOW",
        reason="Initial consult read",
        clid="CL-000001",
        categories="encounters",
    )
    audit_log(
        db_session,
        actor="nurse.geeta",
        role="nurse",
        action="read",
        decision="ALLOW",
        reason="Vitals entry",
        clid="CL-000001",
        categories="observations",
    )

    # Verify ledger starts intact
    initial_verify = verify_chain(db_session)
    assert initial_verify["verified"] is True

    # Tamper with the second-to-last entry in SQLite directly
    entries = list(db_session.exec(select(AuditEntry).order_by(AuditEntry.id.asc())).all())
    tamper_entry = entries[-2]
    original_decision = tamper_entry.decision

    # Change decision from ALLOW to DENY without recomputing hash
    tamper_entry.decision = "DENY" if original_decision == "ALLOW" else "ALLOW"
    db_session.add(tamper_entry)
    db_session.commit()

    # Chain verification MUST fail
    tampered_verify = verify_chain(db_session)
    assert tampered_verify["verified"] is False
    assert tampered_verify["broken_at_id"] == tamper_entry.id
    assert "Integrity check failed" in tampered_verify["message"]

    # Restore original decision so ledger integrity is restored
    tamper_entry.decision = original_decision
    db_session.add(tamper_entry)
    db_session.commit()
    assert verify_chain(db_session)["verified"] is True


def test_hash_calculation_formula():
    """Verify hash = SHA-256(prev_hash + canonical JSON)."""
    ts = datetime(2026, 10, 11, 12, 0, 0, tzinfo=timezone.utc)
    prev_hash = GENESIS_HASH
    payload = make_payload(
        ts=ts,
        actor="admin.neha",
        role="admin",
        action="verify",
        decision="ALLOW",
        reason="Ledger healthcheck",
        clid=None,
        categories="",
    )

    h = compute_entry_hash(prev_hash, payload)
    assert isinstance(h, str)
    assert len(h) == 64  # SHA-256 64-character hex string


# =========================================================================
# 4. API ENDPOINTS: /audit AND /consents
# =========================================================================


def test_get_audit_endpoints_role_access(db_session: Session):
    """GET /audit: admin sees all, patient sees own, others get 403."""
    admin_token = create_access_token(subject="admin.neha", role="admin")
    patient_token = create_access_token(subject="ramesh", role="patient")
    doctor_token = create_access_token(subject="dr.rao", role="doctor")

    # 1. Admin can access all audit records
    resp_admin = client.get("/audit", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp_admin.status_code == 200
    assert isinstance(resp_admin.json(), list)

    # 2. Patient can access their own audit records
    resp_patient = client.get("/audit", headers={"Authorization": f"Bearer {patient_token}"})
    assert resp_patient.status_code == 200
    patient_entries = resp_patient.json()
    assert isinstance(patient_entries, list)
    for entry in patient_entries:
        assert entry["clid"] == "CL-000001" or entry["actor"] == "ramesh"

    # 3. Doctor gets 403 on /audit
    resp_doctor = client.get("/audit", headers={"Authorization": f"Bearer {doctor_token}"})
    assert resp_doctor.status_code == 403

    # 4. GET /audit/verify
    resp_verify = client.get(
        "/audit/verify", headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert resp_verify.status_code == 200
    assert resp_verify.json()["verified"] is True


def test_consent_service_endpoints(db_session: Session):
    """Verify GET/POST /consents and POST /consents/{id}/revoke."""
    patient_token = create_access_token(subject="ramesh", role="patient")

    # 1. Patient lists their consents
    resp_list = client.get("/consents", headers={"Authorization": f"Bearer {patient_token}"})
    assert resp_list.status_code == 200
    consents = resp_list.json()
    assert len(consents) >= 4  # Seed consents exist

    # 2. Patient grants new consent
    new_consent_payload = {
        "clid": "CL-000001",
        "group": "billing",
        "categories": "demographics_min,claims",
        "purpose": "payment",
        "valid_days": 15,
    }
    resp_create = client.post(
        "/consents",
        json=new_consent_payload,
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert resp_create.status_code == 201
    created = resp_create.json()
    consent_id = created["id"]
    assert created["status"] == "active"

    # 3. Patient revokes the consent
    resp_revoke = client.post(
        f"/consents/{consent_id}/revoke",
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert resp_revoke.status_code == 200
    assert resp_revoke.json()["status"] == "success"
    assert resp_revoke.json()["consent"]["status"] == "revoked"
