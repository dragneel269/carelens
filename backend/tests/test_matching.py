"""Tests for identity engine record matching and golden record synthesis.

Verifies:
- Name normalization: lowercase, strip titles, Kumar/Kumaar repeated vowels, R. Kumar and Kumar R.
- Blocking: same phone, or same DOB year + phonetic key.
- Threshold boundaries: 0.90 auto-link, 0.70-0.89 ReviewItem, < 0.70 ignore.
- Phone constraint: phone is never a sole key; never auto-link below 0.90.
- Same-system source IDs always link.
- Seed data integration:
  - Hero's 4 systems merge into one MasterPatient (CL-000001).
  - Both ambiguous pairs (Suresh Patel, Priya Sharma) are NOT merged and appear as ReviewItems.
  - Zero wrong merges across the seed set.
  - User ramesh has linked_clid set by phone.
"""

import json
from typing import Generator

import pytest
from sqlmodel import Session, select

from app.db.session import create_db_and_tables, engine
from app.domain.models import (
    Allergy,
    Claim,
    Condition,
    Encounter,
    IdentityLink,
    MasterPatient,
    Medication,
    Observation,
    ReviewItem,
    SourceRecord,
    User,
)
from app.integration.matching import (
    calculate_match_score,
    collapse_repeated_vowels,
    normalize_name,
    should_block,
)
from app.integration.pipeline import run_ingest
from app.seed import seed_users


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    """Provide a fresh session for testing with tables and users created."""
    create_db_and_tables()
    with Session(engine) as session:
        seed_users(session)
        yield session


# =========================================================================
# 1. NAME NORMALIZATION TESTS (Section 4)
# =========================================================================


def test_name_normalization_titles():
    """Verify honorific titles (Mr/Mrs/Dr/Shri/Smt) are stripped and lowercased."""
    assert normalize_name("Dr. Ramesh Kumar") == "kumar ramesh"
    assert normalize_name("Mr. Ramesh Kumar") == "kumar ramesh"
    assert normalize_name("Mrs. Priya Sharma") == "priya sharma"
    assert normalize_name("Shri Suresh Patel") == "patel suresh"
    assert normalize_name("Smt Priya Sharma") == "priya sharma"


def test_name_normalization_repeated_vowels():
    """Verify repeated vowels are collapsed: Kumar/Kumaar, Geeta, etc."""
    assert collapse_repeated_vowels("kumaar") == "kumar"
    assert collapse_repeated_vowels("geeta") == "geta"
    assert collapse_repeated_vowels("divyaa") == "divya"

    # Ramesh Kumar vs Ramesh Kumaar produce identical normalized names
    norm_kumar = normalize_name("Ramesh Kumar")
    norm_kumaar = normalize_name("Ramesh Kumaar")
    assert norm_kumar == norm_kumaar
    assert norm_kumar == "kumar ramesh"


def test_name_normalization_symmetrical_tokens():
    """Verify 'R Kumar' and 'Kumar R' produce identical normalized names."""
    norm_r_kumar = normalize_name("R. Kumar")
    norm_kumar_r = normalize_name("Kumar R.")
    assert norm_r_kumar == norm_kumar_r
    assert norm_r_kumar == "kumar r"


# =========================================================================
# 2. BLOCKING TESTS (Section 4)
# =========================================================================


def test_blocking_same_phone():
    """Pairs with the same phone must pass blocking."""
    rec_a = SourceRecord(
        source="ehr",
        source_record_id="E1",
        patient_name="Amit Shah",
        dob="1980-01-01",
        phone="90000 11111",
    )
    rec_b = SourceRecord(
        source="lab",
        source_record_id="L1",
        patient_name="Amitabh Bachchan",
        dob="1950-10-11",
        phone="90000 11111",  # Same phone
    )
    assert should_block(rec_a, rec_b) is True


def test_blocking_same_dob_year_and_phonetic_key():
    """Pairs with the same DOB year and matching phonetic key must pass blocking."""
    rec_a = SourceRecord(
        source="ehr",
        source_record_id="E2",
        patient_name="Ramesh Kumar",
        dob="1968-03-14",
        phone="90000 12345",
    )
    rec_b = SourceRecord(
        source="lab",
        source_record_id="L2",
        patient_name="R. Kumar",
        dob="14/03/1968",  # Same year 1968
        phone=None,
    )
    assert should_block(rec_a, rec_b) is True


def test_blocking_rejects_unrelated_pairs():
    """Pairs with different DOB year and different phone must be blocked."""
    rec_a = SourceRecord(
        source="ehr",
        source_record_id="E3",
        patient_name="Ananya Deshmukh",
        dob="1984-06-22",
        phone="90000 21001",
    )
    rec_b = SourceRecord(
        source="lab",
        source_record_id="L3",
        patient_name="Vikramaditya Rao",
        dob="1972-11-04",
        phone="90000 21002",
    )
    assert should_block(rec_a, rec_b) is False


# =========================================================================
# 3. THRESHOLD BOUNDARIES & CONSTRAINTS (Section 4)
# =========================================================================


def test_same_system_ids_always_link():
    """Same-system source IDs always link with score 1.0."""
    rec_a = SourceRecord(
        source="ehr",
        source_record_id="APL-004512",
        patient_name="Ramesh Kumar",
    )
    rec_b = SourceRecord(
        source="ehr",
        source_record_id="APL-004512",
        patient_name="Different Name",
    )
    score, evidence = calculate_match_score(rec_a, rec_b)
    assert score == 1.0
    assert evidence.get("same_system") is True


def test_auto_link_threshold_boundary_0_90():
    """Score >= 0.90 is auto-linked; score < 0.90 is not auto-linked."""
    # Complete match on all 5 attributes -> 1.0 (>= 0.90)
    rec_a = SourceRecord(
        source="ehr",
        source_record_id="E4",
        patient_name="Ramesh Kumar",
        dob="1968-03-14",
        gender="male",
        phone="90000 12345",
        pincode="570001",
    )
    rec_b = SourceRecord(
        source="lab",
        source_record_id="L4",
        patient_name="Ramesh Kumar",
        dob="1968-03-14",
        gender="male",
        phone="90000 12345",
        pincode="570001",
    )
    score, _ = calculate_match_score(rec_a, rec_b)
    assert score >= 0.90

    # Near boundary: Name (0.35) + DOB (0.25) + Phone (0.20) + Pincode (0.10) = 0.90
    rec_c = SourceRecord(
        source="pharmacy",
        source_record_id="P4",
        patient_name="Ramesh Kumaar",  # Collapses to Ramesh Kumar
        dob="1968-03-14",
        gender=None,  # Missing gender
        phone="90000 12345",
        pincode="570001",
    )
    score_c, _ = calculate_match_score(rec_a, rec_c)
    assert score_c >= 0.90


def test_review_item_boundary_0_70_to_0_89():
    """Scores between 0.70 and 0.89 fall into human review and never auto-link."""
    # Priya Sharma pair: same name (0.35) + same DOB (0.25) + same gender (0.10) = 0.70
    # Different phone (0.0) and different pincode (0.0)
    priya_a = SourceRecord(
        source="ehr",
        source_record_id="APL-AMB-02A",
        patient_name="Priya Sharma",
        dob="1990-08-15",
        gender="female",
        phone="90000 44001",
        pincode="110001",
    )
    priya_b = SourceRecord(
        source="lab",
        source_record_id="LB-AMB-02B",
        patient_name="Priya Sharma",
        dob="1990-08-15",
        gender="female",
        phone="90000 44002",  # Different phone
        pincode="560001",  # Different pincode
    )
    score, _ = calculate_match_score(priya_a, priya_b)
    assert 0.70 <= score < 0.90
    assert score == 0.70


def test_phone_never_sole_key_constraint():
    """Phone match alone must never auto-link (< 0.90)."""
    rec_a = SourceRecord(
        source="ehr",
        source_record_id="E5",
        patient_name="Deepak Joshi",
        dob="1975-01-01",
        gender="male",
        phone="90000 99999",
        pincode="400001",
    )
    rec_b = SourceRecord(
        source="lab",
        source_record_id="L5",
        patient_name="Kavita Iyer",  # Totally different name
        dob="1982-12-12",  # Totally different DOB
        gender="female",  # Different gender
        phone="90000 99999",  # Only phone matches!
        pincode="110001",  # Different pincode
    )
    score, _ = calculate_match_score(rec_a, rec_b)
    # Score must be clamped / well below auto-link threshold 0.90
    assert score < 0.90


# =========================================================================
# 4. SEED DATA MATCHING INTEGRATION (Section 4 & Section 8)
# =========================================================================


def test_hero_patient_four_systems_become_one_master_patient(db_session: Session):
    """Hero Ramesh Kumar's 5 records across 4 systems must become one MasterPatient (CL-000001)."""
    # Execute full pipeline ingestion
    run_ingest(db_session)

    # 1. MasterPatient CL-000001 must exist and be Ramesh Kumar
    hero = db_session.exec(select(MasterPatient).where(MasterPatient.clid == "CL-000001")).first()
    assert hero is not None
    assert "ramesh" in hero.name.lower()
    assert "kumar" in hero.name.lower()
    assert hero.dob == "1968-03-14"
    assert hero.phone == "90000 12345"
    assert hero.pincode == "570001"
    assert hero.gender == "male"

    # 2. Check provenance tracking
    prov = json.loads(hero.provenance_json)
    assert prov.get("name") == "ehr"  # EHR has highest source priority
    assert prov.get("dob") == "ehr"

    # 3. Check alternates tracking
    alts = json.loads(hero.alternates_json)
    name_alts = [a["value"] for a in alts.get("name", [])]
    assert any("kumaar" in a.lower() or "r. kumar" in a.lower() for a in name_alts)

    # 4. Verify IdentityLinks for all hero systems
    links = db_session.exec(
        select(IdentityLink).where(IdentityLink.master_clid == "CL-000001")
    ).all()
    linked_systems = {lnk.source for lnk in links}
    linked_record_ids = {lnk.source_record_id for lnk in links}

    # All 4 systems must be present: ehr, lab, pharmacy, claims
    assert "ehr" in linked_systems
    assert "lab" in linked_systems
    assert "pharmacy" in linked_systems
    assert "claims" in linked_systems

    # All specific hero source IDs must be linked:
    assert "APL-004512" in linked_record_ids  # EHR
    assert "LB-77120" in linked_record_ids  # Lab A
    assert "TX-9981" in linked_record_ids  # Lab B (no phone, R. Kumar)
    assert "PH-30991" in linked_record_ids  # Pharmacy (Ramesh Kumaar)
    assert "STAR-48221" in linked_record_ids  # Insurer Claims

    # Every link must have per-field evidence JSON
    for link in links:
        assert link.confidence_score >= 0.90
        evidence = json.loads(link.evidence_json)
        assert bool(evidence) is True


def test_ambiguous_pairs_are_not_merged_and_appear_as_review_items(db_session: Session):
    """Both ambiguous pairs (Suresh Patel, Priya Sharma) must NOT auto-link.

    They must appear in the review_items table.
    """
    run_ingest(db_session)

    # 1. Ambiguous Pair 1: Suresh Patel (APL-AMB-01A and LB-AMB-01B)
    suresh_ehr = db_session.exec(
        select(SourceRecord).where(
            SourceRecord.source == "ehr",
            SourceRecord.source_record_id == "APL-AMB-01A",
        )
    ).first()
    suresh_lab = db_session.exec(
        select(SourceRecord).where(
            SourceRecord.source == "lab",
            SourceRecord.source_record_id == "LB-AMB-01B",
        )
    ).first()
    assert suresh_ehr is not None and suresh_lab is not None
    # Must NOT have the same CLID!
    assert suresh_ehr.clid != suresh_lab.clid

    # 2. Ambiguous Pair 2: Priya Sharma (APL-AMB-02A and LB-AMB-02B)
    priya_ehr = db_session.exec(
        select(SourceRecord).where(
            SourceRecord.source == "ehr",
            SourceRecord.source_record_id == "APL-AMB-02A",
        )
    ).first()
    priya_lab = db_session.exec(
        select(SourceRecord).where(
            SourceRecord.source == "lab",
            SourceRecord.source_record_id == "LB-AMB-02B",
        )
    ).first()
    assert priya_ehr is not None and priya_lab is not None
    # Must NOT have the same CLID!
    assert priya_ehr.clid != priya_lab.clid

    # 3. Both pairs must appear in review_items table
    review_items = db_session.exec(select(ReviewItem)).all()
    review_record_pairs = {(r.record_id_a, r.record_id_b) for r in review_items} | {
        (r.record_id_b, r.record_id_a) for r in review_items
    }

    assert ("APL-AMB-01A", "LB-AMB-01B") in review_record_pairs
    assert ("APL-AMB-02A", "LB-AMB-02B") in review_record_pairs

    # ReviewItem scores must be between 0.70 and 0.89
    for r in review_items:
        assert 0.70 <= r.score < 0.90


def test_user_ramesh_linked_clid_set_by_phone(db_session: Session):
    """User ramesh must have linked_clid set to hero's CLID (CL-000001)."""
    run_ingest(db_session)

    ramesh_user = db_session.exec(select(User).where(User.username == "ramesh")).first()
    assert ramesh_user is not None
    assert ramesh_user.linked_clid == "CL-000001"


def test_child_clinical_entities_have_propagated_clid(db_session: Session):
    """Clinical child entities associated with hero's source records must have clid == CL-000001."""
    run_ingest(db_session)

    hero_encounters = db_session.exec(
        select(Encounter).where(Encounter.source_record_id == "APL-004512")
    ).all()
    assert len(hero_encounters) == 3
    for enc in hero_encounters:
        assert enc.clid == "CL-000001"

    hero_conditions = db_session.exec(
        select(Condition).where(Condition.source_record_id == "APL-004512")
    ).all()
    assert len(hero_conditions) == 2
    for cond in hero_conditions:
        assert cond.clid == "CL-000001"

    hero_allergies = db_session.exec(
        select(Allergy).where(Allergy.source_record_id == "APL-004512")
    ).all()
    assert len(hero_allergies) == 1
    assert hero_allergies[0].clid == "CL-000001"

    hero_meds = db_session.exec(
        select(Medication).where(Medication.source_record_id.in_(["APL-004512", "PH-30991"]))
    ).all()
    assert len(hero_meds) > 0
    for med in hero_meds:
        assert med.clid == "CL-000001"

    hero_obs = db_session.exec(
        select(Observation).where(Observation.source_record_id.in_(["LB-77120", "TX-9981"]))
    ).all()
    assert len(hero_obs) > 0
    for obs in hero_obs:
        assert obs.clid == "CL-000001"

    hero_claims = db_session.exec(select(Claim).where(Claim.source_record_id == "STAR-48221")).all()
    assert len(hero_claims) == 2
    for clm in hero_claims:
        assert clm.clid == "CL-000001"
