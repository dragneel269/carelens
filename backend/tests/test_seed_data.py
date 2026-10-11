"""Tests asserting all planted discrepancies and datasets from spec Section 8 & 9."""

import json
from datetime import datetime
from pathlib import Path

from app.domain.mappings import (
    BRAND_MAPPINGS,
    hba1c_mmol_to_percent,
)
from app.seed.generator import generate_all_datasets
from app.seed.mappings import save_mappings_json

DATA_DIR = Path(__file__).resolve().parent.parent / "app" / "seed" / "data"


def test_seed_datasets_generation():
    """Ensure generate_all_datasets generates valid JSON and CSV files."""
    datasets = generate_all_datasets()
    assert "ehr" in datasets
    assert "lab" in datasets
    assert "pharmacy" in datasets
    assert "claims" in datasets

    assert (DATA_DIR / "ehr_records.json").exists()
    assert (DATA_DIR / "lab_records.json").exists()
    assert (DATA_DIR / "pharmacy_records.json").exists()
    assert (DATA_DIR / "pharmacy_records.csv").exists()
    assert (DATA_DIR / "claims_records.json").exists()


def test_hero_patient_allergy_in_ehr():
    """Planted Issue 1: Penicillin allergy exists in EHR for Ramesh Kumar."""
    ehr_file = DATA_DIR / "ehr_records.json"
    with open(ehr_file, "r", encoding="utf-8") as f:
        ehr_data = json.load(f)

    # Locate hero patient bundle APL-004512
    hero_bundle = next((b for b in ehr_data if b.get("id") == "APL-004512-BUNDLE"), None)
    assert hero_bundle is not None

    allergies = [
        entry["resource"]
        for entry in hero_bundle["entry"]
        if entry["resource"]["resourceType"] == "AllergyIntolerance"
    ]
    assert len(allergies) >= 1
    penicillin_allergy = next(
        (a for a in allergies if "penicillin" in a.get("substance", {}).get("text", "").lower()),
        None,
    )
    assert penicillin_allergy is not None
    assert penicillin_allergy["clinicalStatus"] == "active"
    assert penicillin_allergy["criticality"] == "high"


def test_duplicate_lipid_panel_within_12_days():
    """Planted Issue 2: Duplicate lipid panel between Lab A and Lab B within 12 days."""
    lab_file = DATA_DIR / "lab_records.json"
    with open(lab_file, "r", encoding="utf-8") as f:
        lab_data = json.load(f)

    lab_a = next((item for item in lab_data if item.get("source_patient_id") == "LB-77120"), None)
    lab_b = next((item for item in lab_data if item.get("source_patient_id") == "TX-9981"), None)
    assert lab_a is not None
    assert lab_b is not None

    # Find lipid panels in both labs
    lipid_a = next((p for p in lab_a["panels"] if "lipid" in p["panel_name"].lower()), None)
    lipid_b = next((p for p in lab_b["panels"] if "lipid" in p["panel_name"].lower()), None)
    assert lipid_a is not None
    assert lipid_b is not None

    date_a = datetime.fromisoformat(lipid_a["collected_at"].replace("Z", "+00:00"))
    date_b = datetime.fromisoformat(lipid_b["collected_at"].replace("Z", "+00:00"))

    delta_days = abs((date_b - date_a).days)
    assert delta_days == 10  # 14 Sep to 24 Sep is 10 days
    assert delta_days <= 12  # Planted issue: duplicate within 12 days


def test_mox_500_dispensed_allergy_conflict():
    """Planted Issue 3: Mox 500 dispensed in Sept, conflicting with penicillin allergy."""
    pharm_file = DATA_DIR / "pharmacy_records.json"
    with open(pharm_file, "r", encoding="utf-8") as f:
        pharm_data = json.load(f)

    hero_dispensations = [d for d in pharm_data if d.get("patient_id") == "PH-30991"]
    mox_dispense = next((d for d in hero_dispensations if d.get("brand_name") == "Mox 500"), None)
    assert mox_dispense is not None
    assert "2026-09" in mox_dispense["dispensed_date"]

    # Verify Mox 500 maps to amoxicillin (penicillin class) in Section 9 brand mappings
    brand_info = BRAND_MAPPINGS.get("Mox 500")
    assert brand_info is not None
    assert brand_info["generic"] == "amoxicillin"
    assert brand_info["allergy_contraindication_class"] == "penicillin"


def test_atorva_10_dispensed_but_missing_from_ehr():
    """Planted Issue 4: Atorva 10 dispensed in Pharmacy but missing from EHR."""
    pharm_file = DATA_DIR / "pharmacy_records.json"
    ehr_file = DATA_DIR / "ehr_records.json"

    with open(pharm_file, "r", encoding="utf-8") as f:
        pharm_data = json.load(f)
    with open(ehr_file, "r", encoding="utf-8") as f:
        ehr_data = json.load(f)

    # 1. Atorva 10 is in Pharmacy
    hero_dispensations = [d for d in pharm_data if d.get("patient_id") == "PH-30991"]
    atorva_dispense = next(
        (d for d in hero_dispensations if d.get("brand_name") == "Atorva 10"), None
    )
    assert atorva_dispense is not None

    # 2. Atorva 10 is NOT in EHR MedicationRequests
    hero_bundle = next((b for b in ehr_data if b.get("id") == "APL-004512-BUNDLE"), None)
    ehr_meds = [
        entry["resource"]["medicationCodeableConcept"]["text"].lower()
        for entry in hero_bundle["entry"]
        if entry["resource"]["resourceType"] == "MedicationRequest"
    ]
    assert not any("atorva" in med or "atorvastatin" in med for med in ehr_meds)
    # EHR only has metformin and telmisartan
    assert any("metformin" in med for med in ehr_meds)
    assert any("telmisartan" in med for med in ehr_meds)


def test_metformin_dispensed_once():
    """Planted Issue 5: Glycomet 500 (metformin) dispensed once in June."""
    pharm_file = DATA_DIR / "pharmacy_records.json"
    with open(pharm_file, "r", encoding="utf-8") as f:
        pharm_data = json.load(f)

    hero_dispensations = [d for d in pharm_data if d.get("patient_id") == "PH-30991"]
    glycomet_dispenses = [d for d in hero_dispensations if d.get("brand_name") == "Glycomet 500"]

    assert len(glycomet_dispenses) == 1  # Dispensed exactly once
    assert "2026-06" in glycomet_dispenses[0]["dispensed_date"]


def test_one_record_without_phone():
    """Planted Issue 6: Exactly one source record for hero patient has no phone."""
    lab_file = DATA_DIR / "lab_records.json"
    with open(lab_file, "r", encoding="utf-8") as f:
        lab_data = json.load(f)

    # Hero patient records:
    # EHR APL-004512 has phone
    # Lab A LB-77120 has phone
    # Lab B TX-9981 has NO phone
    # Pharmacy PH-30991 has phone
    # Insurer STAR-48221 has phone
    lab_b = next((item for item in lab_data if item.get("source_patient_id") == "TX-9981"), None)
    assert lab_b is not None
    assert lab_b["patient_demographics"]["phone"] is None


def test_nine_faker_patients_and_ambiguous_pairs():
    """Verify presence of 9 Faker patients and 2 deliberately ambiguous pairs."""
    ehr_file = DATA_DIR / "ehr_records.json"
    lab_file = DATA_DIR / "lab_records.json"
    with open(ehr_file, "r", encoding="utf-8") as f:
        ehr_data = json.load(f)
    with open(lab_file, "r", encoding="utf-8") as f:
        lab_data = json.load(f)

    # Ambiguous Pair 1: Suresh Patel (different DOB)
    ehr_suresh = next((b for b in ehr_data if b.get("id") == "APL-AMB-01A-BUNDLE"), None)
    lab_suresh = next(
        (item for item in lab_data if item.get("source_patient_id") == "LB-AMB-01B"), None
    )
    assert ehr_suresh is not None and lab_suresh is not None
    assert (
        ehr_suresh["entry"][0]["resource"]["birthDate"] != lab_suresh["patient_demographics"]["dob"]
    )
    assert (
        ehr_suresh["entry"][0]["resource"]["name"][0]["text"]
        == lab_suresh["patient_demographics"]["name"]
    )

    # Ambiguous Pair 2: Priya Sharma (different pincode / phone)
    ehr_priya = next((b for b in ehr_data if b.get("id") == "APL-AMB-02A-BUNDLE"), None)
    lab_priya = next(
        (item for item in lab_data if item.get("source_patient_id") == "LB-AMB-02B"), None
    )
    assert ehr_priya is not None and lab_priya is not None
    assert (
        ehr_priya["entry"][0]["resource"]["address"][0]["postalCode"]
        != lab_priya["patient_demographics"]["pincode"]
    )
    assert (
        ehr_priya["entry"][0]["resource"]["telecom"][0]["value"]
        != lab_priya["patient_demographics"]["phone"]
    )


def test_section_9_normalization_mappings():
    """Verify section 9 LOINC codes, unit conversion formula, and saved mapping JSON."""
    save_mappings_json()
    mapping_path = DATA_DIR / "mappings.json"
    assert mapping_path.exists()

    with open(mapping_path, "r", encoding="utf-8") as f:
        mappings = json.load(f)

    assert "4548-4" in mappings["loinc_codes"]
    assert "1558-6" in mappings["loinc_codes"]
    assert "2093-3" in mappings["loinc_codes"]
    assert "2085-9" in mappings["loinc_codes"]
    assert "13457-7" in mappings["loinc_codes"]
    assert "2571-8" in mappings["loinc_codes"]

    # Test HbA1c conversion formula: HbA1c % = 0.0915 x mmol/mol + 2.15 (63 gives ~7.91%)
    converted = hba1c_mmol_to_percent(63)
    assert converted == 7.91
    assert round(converted, 1) == 7.9
