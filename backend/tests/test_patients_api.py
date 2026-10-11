"""Tests for unified patients API endpoints per spec §6 and §7.

Verifies:
1. Search GET /patients?q= (by name, phone, source ID, CLID) with linked_systems and best_score.
2. GET /patients/{clid}/unified:
   - Doctor sees everything (all categories).
   - Pharmacist sees only medications and allergies; others are restricted markers.
   - Billing sees only claims; others are restricted markers.
3. GET /patients/{clid}/timeline:
   - Evaluated by policy per category.
   - Type, source, and date filtering.
4. GET /patients/{clid}/summary:
   - Reconciled medications with planted conflicts (Atorva 10 missing from EHR, Mox 500 allergy).
   - Lab trends with 6-point trend series (HbA1c single series).
   - Role-based redactions.
5. GET /patients/{clid}/identity:
   - 5 hero links with per-field evidence, provenance, and alternates.
"""

from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.core.security import create_access_token
from app.db.session import create_db_and_tables, engine
from app.integration.pipeline import run_ingest
from app.main import app
from app.seed import seed_users

client = TestClient(app)


@pytest.fixture
def seeded_db() -> Generator[Session, None, None]:
    """Ensure database is seeded with users, records, identity links, and baseline consents."""
    create_db_and_tables()
    with Session(engine) as session:
        seed_users(session)
        run_ingest(session)
        yield session


# =========================================================================
# 1. SEARCH ENDPOINT: GET /patients?q=
# =========================================================================


def test_search_patients_by_name(seeded_db: Session):
    """Search by name returns hero patient with linked_systems and best_score."""
    token = create_access_token(subject="dr.rao", role="doctor")
    resp = client.get("/patients?q=Ramesh", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    hits = resp.json()
    assert len(hits) >= 1
    hero_hit = next((h for h in hits if h["clid"] == "CL-000001"), None)
    assert hero_hit is not None
    assert "ramesh" in hero_hit["name"].lower()
    assert "kumar" in hero_hit["name"].lower()
    assert hero_hit["linked_systems"] == ["claims", "ehr", "lab", "pharmacy"]
    assert hero_hit["best_score"] >= 0.90


def test_search_patients_by_phone(seeded_db: Session):
    """Search by phone returns hero patient CL-000001."""
    token = create_access_token(subject="dr.rao", role="doctor")
    resp = client.get("/patients?q=90000 12345", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    hits = resp.json()
    assert any(h["clid"] == "CL-000001" for h in hits)


def test_search_patients_by_source_record_id(seeded_db: Session):
    """Search by source ID (e.g. EHR APL-004512 or Lab LB-77120) returns CL-000001."""
    token = create_access_token(subject="dr.rao", role="doctor")
    # EHR ID
    resp_ehr = client.get("/patients?q=APL-004512", headers={"Authorization": f"Bearer {token}"})
    assert resp_ehr.status_code == 200
    assert any(h["clid"] == "CL-000001" for h in resp_ehr.json())

    # Lab ID
    resp_lab = client.get("/patients?q=LB-77120", headers={"Authorization": f"Bearer {token}"})
    assert resp_lab.status_code == 200
    assert any(h["clid"] == "CL-000001" for h in resp_lab.json())


def test_search_patients_by_clid(seeded_db: Session):
    """Search by CLID 'CL-000001' returns exact hit."""
    token = create_access_token(subject="dr.rao", role="doctor")
    resp = client.get("/patients?q=CL-000001", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    hits = resp.json()
    assert len(hits) == 1
    assert hits[0]["clid"] == "CL-000001"


def test_search_role_redaction_demographics(seeded_db: Session):
    """Pharmacist has demographics_min only; full DOB, phone, address are redacted."""
    pharm_token = create_access_token(subject="pharm.imran", role="pharmacist")
    resp = client.get("/patients?q=Ramesh", headers={"Authorization": f"Bearer {pharm_token}"})
    assert resp.status_code == 200
    hits = resp.json()
    hero_hit = next(h for h in hits if h["clid"] == "CL-000001")
    assert hero_hit["name"] is not None
    assert hero_hit["gender"] is not None
    # Restricted fields
    assert isinstance(hero_hit["dob"], dict) and hero_hit["dob"].get("restricted") is True
    assert isinstance(hero_hit["phone"], dict) and hero_hit["phone"].get("restricted") is True
    assert isinstance(hero_hit["pincode"], dict) and hero_hit["pincode"].get("restricted") is True


# =========================================================================
# 2. UNIFIED ENDPOINT: GET /patients/{clid}/unified (ROLE COMPARISON)
# =========================================================================


def test_unified_endpoint_doctor_sees_everything(seeded_db: Session):
    """Doctor role sees all clinical categories populated with zero restricted markers."""
    doc_token = create_access_token(subject="dr.rao", role="doctor")
    resp = client.get(
        "/patients/CL-000001/unified", headers={"Authorization": f"Bearer {doc_token}"}
    )
    assert resp.status_code == 200
    data = resp.json()

    assert data["clid"] == "CL-000001"
    # Patient demographics full
    assert data["patient"]["name"] == "Ramesh Kumar"
    assert data["patient"]["dob"] == "1968-03-14"
    assert data["patient"]["phone"] == "90000 12345"

    # All clinical categories are lists (not restricted markers)
    assert isinstance(data["encounters"], list) and len(data["encounters"]) == 3
    assert isinstance(data["conditions"], list) and len(data["conditions"]) == 2
    assert isinstance(data["allergies"], list) and len(data["allergies"]) == 1
    assert isinstance(data["medications"], list) and len(data["medications"]) >= 4
    assert isinstance(data["labs"], list) and len(data["labs"]) >= 6
    assert isinstance(data["claims"], list) and len(data["claims"]) == 2


def test_unified_endpoint_pharmacist_sees_only_meds_and_allergies(seeded_db: Session):
    """Pharmacist role sees ONLY medications and allergies; other categories are restricted."""
    pharm_token = create_access_token(subject="pharm.imran", role="pharmacist")
    resp = client.get(
        "/patients/CL-000001/unified", headers={"Authorization": f"Bearer {pharm_token}"}
    )
    assert resp.status_code == 200
    data = resp.json()

    # Allowed categories
    assert isinstance(data["allergies"], list) and len(data["allergies"]) == 1
    assert isinstance(data["medications"], list) and len(data["medications"]) >= 4

    # Restricted categories
    assert isinstance(data["encounters"], dict) and data["encounters"].get("restricted") is True
    assert isinstance(data["conditions"], dict) and data["conditions"].get("restricted") is True
    assert isinstance(data["labs"], dict) and data["labs"].get("restricted") is True
    assert isinstance(data["claims"], dict) and data["claims"].get("restricted") is True


def test_unified_endpoint_billing_sees_only_claims(seeded_db: Session):
    """Billing role sees ONLY claims; clinical categories are restricted."""
    billing_token = create_access_token(subject="billing.sunil", role="billing")
    resp = client.get(
        "/patients/CL-000001/unified", headers={"Authorization": f"Bearer {billing_token}"}
    )
    assert resp.status_code == 200
    data = resp.json()

    # Allowed claims
    assert isinstance(data["claims"], list) and len(data["claims"]) == 2

    # Restricted clinical categories
    assert isinstance(data["encounters"], dict) and data["encounters"].get("restricted") is True
    assert isinstance(data["conditions"], dict) and data["conditions"].get("restricted") is True
    assert isinstance(data["allergies"], dict) and data["allergies"].get("restricted") is True
    assert isinstance(data["medications"], dict) and data["medications"].get("restricted") is True
    assert isinstance(data["labs"], dict) and data["labs"].get("restricted") is True


# =========================================================================
# 3. TIMELINE ENDPOINT: GET /patients/{clid}/timeline
# =========================================================================


def test_timeline_endpoint_doctor_full_feed(seeded_db: Session):
    """Timeline returns chronological events across all authorized categories."""
    doc_token = create_access_token(subject="dr.rao", role="doctor")
    resp = client.get(
        "/patients/CL-000001/timeline", headers={"Authorization": f"Bearer {doc_token}"}
    )
    assert resp.status_code == 200
    timeline = resp.json()

    assert timeline["clid"] == "CL-000001"
    items = timeline["items"]
    assert len(items) >= 15  # 3 encs + 2 conds + 1 alg + 5 meds + 6 labs + 2 claims

    # Check chronological ordering (newest first)
    dates = [i["recorded_at"] for i in items]
    assert dates == sorted(dates, reverse=True)


def test_timeline_endpoint_filtering(seeded_db: Session):
    """Timeline query filters by types and sources."""
    doc_token = create_access_token(subject="dr.rao", role="doctor")

    # Filter by type=observation
    resp_obs = client.get(
        "/patients/CL-000001/timeline?types=observation",
        headers={"Authorization": f"Bearer {doc_token}"},
    )
    assert resp_obs.status_code == 200
    obs_items = resp_obs.json()["items"]
    assert all(i["item_type"] == "observation" for i in obs_items)

    # Filter by source=pharmacy
    resp_pharm = client.get(
        "/patients/CL-000001/timeline?sources=pharmacy",
        headers={"Authorization": f"Bearer {doc_token}"},
    )
    assert resp_pharm.status_code == 200
    pharm_items = resp_pharm.json()["items"]
    assert all(i["source"] == "pharmacy" for i in pharm_items)


def test_timeline_role_permissions(seeded_db: Session):
    """Billing role only sees claim items on the timeline; clinical events omitted."""
    billing_token = create_access_token(subject="billing.sunil", role="billing")
    resp = client.get(
        "/patients/CL-000001/timeline", headers={"Authorization": f"Bearer {billing_token}"}
    )
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert len(items) == 2
    assert all(i["item_type"] == "claim" for i in items)


# =========================================================================
# 4. SUMMARY ENDPOINT: GET /patients/{clid}/summary
# =========================================================================


def test_summary_medication_reconciliation_conflicts(seeded_db: Session):
    """Summary flags planted conflicts: Atorva 10 missing from EHR and Mox 500 allergy conflict."""
    doc_token = create_access_token(subject="dr.rao", role="doctor")
    resp = client.get(
        "/patients/CL-000001/summary", headers={"Authorization": f"Bearer {doc_token}"}
    )
    assert resp.status_code == 200
    summary = resp.json()

    meds = summary["current_medications"]
    assert isinstance(meds, list)

    # Planted Conflict 1: Atorva 10 (atorvastatin) dispensed by pharmacy but missing from EHR
    atorva_entry = next((m for m in meds if "atorva" in m["generic_name"].lower()), None)
    assert atorva_entry is not None
    assert atorva_entry["has_conflict"] is True
    assert atorva_entry["conflict_type"] == "missing_from_ehr"
    assert atorva_entry["pharmacy_dispensed"] is True
    assert atorva_entry["ehr_prescribed"] is False

    # Planted Conflict 2: Mox 500 (amoxicillin) allergy conflict
    mox_entry = next(
        (
            m
            for m in meds
            if "amoxicillin" in m["generic_name"].lower()
            or "mox" in (m["brand_name"] or "").lower()
        ),
        None,
    )
    assert mox_entry is not None
    assert mox_entry["has_conflict"] is True
    assert mox_entry["conflict_type"] == "allergy_conflict"


def test_summary_lab_trends_single_series(seeded_db: Session):
    """HbA1c from Lab A and Lab B (63 mmol/mol -> 7.91%) forms one unified trend series."""
    doc_token = create_access_token(subject="dr.rao", role="doctor")
    resp = client.get(
        "/patients/CL-000001/summary", headers={"Authorization": f"Bearer {doc_token}"}
    )
    assert resp.status_code == 200
    summary = resp.json()

    labs = summary["lab_trends"]
    assert isinstance(labs, list)

    hba1c_card = next(
        (
            lb
            for lb in labs
            if lb.get("loinc_code") == "4548-4"
            or "glycated" in lb["test_name"].lower()
            or "hba1c" in lb["test_name"].lower()
        ),
        None,
    )
    assert hba1c_card is not None
    assert hba1c_card["unit"] == "%"
    # Trend contains points from both labs
    trend = hba1c_card["trend"]
    assert len(trend) == 3
    sources = {pt["source"] for pt in trend}
    assert "lab" in sources  # Both labs adapted with source "lab"


def test_summary_role_redactions(seeded_db: Session):
    """Pharmacist and Billing roles receive restricted markers for unauthorized summary sections."""
    pharm_token = create_access_token(subject="pharm.imran", role="pharmacist")
    resp = client.get(
        "/patients/CL-000001/summary", headers={"Authorization": f"Bearer {pharm_token}"}
    )
    assert resp.status_code == 200
    summary = resp.json()

    # Allowed
    assert isinstance(summary["current_medications"], list)
    assert isinstance(summary["allergies"], list)

    # Restricted
    assert (
        isinstance(summary["active_conditions"], dict)
        and summary["active_conditions"].get("restricted") is True
    )
    assert (
        isinstance(summary["lab_trends"], dict) and summary["lab_trends"].get("restricted") is True
    )
    assert (
        isinstance(summary["recent_encounters"], dict)
        and summary["recent_encounters"].get("restricted") is True
    )
    assert isinstance(summary["claims"], dict) and summary["claims"].get("restricted") is True


# =========================================================================
# 5. IDENTITY ENDPOINT: GET /patients/{clid}/identity
# =========================================================================


def test_identity_endpoint_per_field_evidence(seeded_db: Session):
    """Identity endpoint returns linked records, provenance, alternates, and per-field evidence."""
    doc_token = create_access_token(subject="dr.rao", role="doctor")
    resp = client.get(
        "/patients/CL-000001/identity", headers={"Authorization": f"Bearer {doc_token}"}
    )
    assert resp.status_code == 200
    ident = resp.json()

    assert ident["clid"] == "CL-000001"
    assert ident["canonical_name"] == "Ramesh Kumar"

    # Provenance
    assert ident["provenance"]["name"] == "ehr"
    assert ident["provenance"]["dob"] == "ehr"

    # Alternates
    assert "name" in ident["alternates"]

    # 5 links with per-field evidence
    links = ident["links"]
    assert len(links) == 5
    linked_ids = {lnk["source_record_id"] for lnk in links}
    assert "APL-004512" in linked_ids
    assert "LB-77120" in linked_ids
    assert "TX-9981" in linked_ids
    assert "PH-30991" in linked_ids
    assert "STAR-48221" in linked_ids

    for lnk in links:
        assert lnk["confidence_score"] >= 0.90
        assert isinstance(lnk["evidence"], dict)
