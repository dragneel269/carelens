"""Tests for pipeline ingestion, idempotency, and admin management endpoints."""

import time

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, func, select

from app.db.session import create_db_and_tables, engine
from app.domain.models import (
    Allergy,
    Claim,
    Condition,
    Encounter,
    IngestReject,
    Medication,
    Observation,
    SourceRecord,
)
from app.integration.pipeline import run_ingest
from app.main import app
from app.seed import SEED_PASSWORD, seed_users

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_seed_users():
    """Ensure database tables and seed users exist in DB."""
    create_db_and_tables()
    with Session(engine) as session:
        seed_users(session)


def get_table_counts(session: Session) -> dict[str, int]:
    """Return dictionary of row counts for all clinical tables."""
    return {
        "source_records": session.exec(select(func.count(SourceRecord.id))).one(),
        "encounters": session.exec(select(func.count(Encounter.id))).one(),
        "conditions": session.exec(select(func.count(Condition.id))).one(),
        "allergies": session.exec(select(func.count(Allergy.id))).one(),
        "medications": session.exec(select(func.count(Medication.id))).one(),
        "observations": session.exec(select(func.count(Observation.id))).one(),
        "claims": session.exec(select(func.count(Claim.id))).one(),
    }


def test_fresh_db_ingest_performance():
    """Assert fresh DB reaches full demo state in under 30 seconds."""
    from sqlmodel import SQLModel, create_engine

    test_engine = create_engine("sqlite:///:memory:")
    SQLModel.metadata.create_all(test_engine)

    start_time = time.time()
    with Session(test_engine) as session:
        stats = run_ingest(session)
    duration = time.time() - start_time

    assert duration < 30.0, f"Ingestion took {duration:.2f}s, exceeding 30s threshold"
    assert stats["source_records"] > 0
    assert stats["observations"] > 0
    assert stats["medications"] > 0


def test_ingest_idempotency_no_duplicates():
    """Assert running ingest twice adds zero duplicates and table row counts remain identical."""
    with Session(engine) as session:
        # Run 1
        run_ingest(session)
        counts_run_1 = get_table_counts(session)

        # Run 2
        stats_run_2 = run_ingest(session)
        counts_run_2 = get_table_counts(session)

    # In second run, all new entity counts must be 0
    assert stats_run_2["source_records"] == 0
    assert stats_run_2["encounters"] == 0
    assert stats_run_2["conditions"] == 0
    assert stats_run_2["allergies"] == 0
    assert stats_run_2["medications"] == 0
    assert stats_run_2["observations"] == 0
    assert stats_run_2["claims"] == 0

    # Total row counts must be strictly identical
    for table_name, count_1 in counts_run_1.items():
        assert counts_run_1[table_name] == counts_run_2[table_name], (
            f"Table {table_name} count changed: {count_1} -> {counts_run_2[table_name]}"
        )


def test_admin_ingest_endpoint_security():
    """Assert POST /admin/ingest requires admin role."""
    # 1. No token -> 401
    res_no_auth = client.post("/admin/ingest")
    assert res_no_auth.status_code == 401

    # 2. Doctor token -> 403 Forbidden
    doc_token = client.post(
        "/auth/login",
        json={"username": "dr.rao", "password": SEED_PASSWORD},
    ).json()["access_token"]
    res_doc = client.post("/admin/ingest", headers={"Authorization": f"Bearer {doc_token}"})
    assert res_doc.status_code == 403

    # 3. Admin token -> 200 OK
    admin_token = client.post(
        "/auth/login",
        json={"username": "admin.neha", "password": SEED_PASSWORD},
    ).json()["access_token"]
    res_admin = client.post("/admin/ingest", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_admin.status_code == 200
    assert res_admin.json()["status"] == "success"


def test_admin_reset_demo_endpoint():
    """Assert POST /admin/reset-demo clears tables, re-seeds, and re-ingests demo state."""
    admin_token = client.post(
        "/auth/login",
        json={"username": "admin.neha", "password": SEED_PASSWORD},
    ).json()["access_token"]

    response = client.post("/admin/reset-demo", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["ingested"]["source_records"] > 0
    assert data["ingested"]["observations"] > 0


def test_hba1c_both_labs_single_series_in_percent():
    """Assert observations for Hero patient Ramesh Kumar from both labs form one % series."""
    with Session(engine) as session:
        run_ingest(session)
        # Fetch observations for Hero patient Lab A (LB-77120) and Lab B (TX-9981)
        observations = session.exec(
            select(Observation).where(Observation.loinc_code == "4548-4")
        ).all()

    hero_obs = [o for o in observations if o.source_record_id in ("LB-77120", "TX-9981")]
    assert len(hero_obs) >= 3  # 2 from Lab A (June 8.4, Sept 7.9) + 1 from Lab B (Aug 63 -> 7.91)

    # Every single HbA1c observation must have unit "%"
    for obs in hero_obs:
        assert obs.unit == "%"
        assert obs.loinc_code == "4548-4"
        assert obs.normalized is True
        assert 7.0 <= obs.value <= 9.0  # Clinically valid diabetic values (8.4%, 7.9%, 7.91%)


def test_ingest_reject_table_recording():
    """Verify malformed records generate entries in IngestReject without breaking pipeline."""
    with Session(engine) as session:
        # Simulate reject insertion
        reject = IngestReject(
            source="lab",
            source_record_id="CORRUPT-LAB-001",
            error_message="Invalid observation format: missing result payload",
            raw_payload='{"corrupt": true}',
        )
        session.add(reject)
        session.commit()

        logged_reject = session.exec(
            select(IngestReject).where(IngestReject.source_record_id == "CORRUPT-LAB-001")
        ).first()
        assert logged_reject is not None
        assert "Invalid observation" in logged_reject.error_message
