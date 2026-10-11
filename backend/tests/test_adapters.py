"""Unit tests for source feeder adapters and normalization routines."""

from app.integration.adapters import (
    adapt_ehr_bundle,
    adapt_insurer_claim,
    adapt_lab_report,
    adapt_pharmacy_dispense,
)
from app.integration.normalization import (
    normalize_lab_observation,
    normalize_medication,
    parse_date_of_birth,
    parse_iso_datetime,
)


def test_parse_iso_datetime():
    """Verify robust date parsing across ISO and localized DD/MM/YYYY formats."""
    dt1 = parse_iso_datetime("2026-09-14T11:30:00Z")
    assert dt1.year == 2026 and dt1.month == 9 and dt1.day == 14

    dt2 = parse_iso_datetime("14/03/1968")
    assert dt2.year == 1968 and dt2.month == 3 and dt2.day == 14

    dob_norm = parse_date_of_birth("14/03/1968")
    assert dob_norm == "1968-03-14"


def test_adapt_ehr_bundle():
    """Verify EHR adapter maps FHIR bundle into canonical source record and clinical entities."""
    sample_bundle = {
        "resourceType": "Bundle",
        "id": "APL-TEST-BUNDLE",
        "entry": [
            {
                "resource": {
                    "resourceType": "Patient",
                    "id": "APL-998811",
                    "name": [{"text": "Suresh Patel"}],
                    "gender": "male",
                    "birthDate": "1974-05-12",
                    "telecom": [{"system": "phone", "value": "90000 33001"}],
                    "address": [{"city": "Ahmedabad", "postalCode": "380001"}],
                }
            },
            {
                "resource": {
                    "resourceType": "Encounter",
                    "id": "ENC-TEST-1",
                    "period": {"start": "2026-04-10T10:00:00Z"},
                    "reasonCode": [{"text": "Cardiology Consultation"}],
                }
            },
            {
                "resource": {
                    "resourceType": "Condition",
                    "id": "COND-TEST-1",
                    "code": {"text": "Essential hypertension", "coding": [{"code": "I10"}]},
                    "recordedDate": "2026-04-10T10:00:00Z",
                }
            },
            {
                "resource": {
                    "resourceType": "AllergyIntolerance",
                    "id": "ALG-TEST-1",
                    "substance": {"text": "Sulfa drugs", "class": "sulfonamide"},
                    "reaction": [{"manifestation": [{"text": "Rash"}]}],
                    "recordedDate": "2026-04-10T10:00:00Z",
                }
            },
            {
                "resource": {
                    "resourceType": "MedicationRequest",
                    "id": "MED-TEST-1",
                    "medicationCodeableConcept": {"text": "Telma 40"},
                    "authoredOn": "2026-04-10T10:00:00Z",
                }
            },
        ],
    }

    src_rec, encs, conds, algs, meds = adapt_ehr_bundle(sample_bundle)

    assert src_rec.source == "ehr"
    assert src_rec.source_record_id == "APL-998811"
    assert src_rec.patient_name == "Suresh Patel"
    assert src_rec.dob == "1974-05-12"
    assert src_rec.pincode == "380001"

    assert len(encs) == 1
    assert encs[0].encounter_id == "ENC-TEST-1"
    assert encs[0].reason == "Cardiology Consultation"

    assert len(conds) == 1
    assert conds[0].condition_id == "COND-TEST-1"
    assert conds[0].code == "I10"

    assert len(algs) == 1
    assert algs[0].allergy_id == "ALG-TEST-1"
    assert algs[0].substance == "Sulfa drugs"

    assert len(meds) == 1
    assert meds[0].medication_id == "MED-TEST-1"
    assert meds[0].generic_name == "telmisartan"
    assert meds[0].normalized is True


def test_adapt_lab_report_and_hba1c_unification():
    """Verify Lab adapter normalizes local codes and converts HbA1c to unified % series."""
    # Lab A sample (Local code GLYCO HB in %)
    lab_a_payload = {
        "report_id": "REP-LBA-001",
        "source_patient_id": "LB-77120",
        "patient_demographics": {
            "name": "Ramesh Kumar",
            "dob": "1968-03-14",
            "gender": "male",
            "phone": "90000 12345",
            "pincode": "570001",
        },
        "panels": [
            {
                "panel_name": "Glyco Monitor",
                "collected_at": "2026-06-10T08:00:00Z",
                "results": [
                    {
                        "local_code": "GLYCO HB",
                        "test_name": "Glycated Hemoglobin",
                        "value": 8.4,
                        "unit": "%",
                    },
                    {
                        "local_code": "FBS",
                        "test_name": "Fasting Blood Sugar",
                        "value": 134,
                        "unit": "mg/dL",
                    },
                ],
            }
        ],
    }

    # Lab B sample (Local code HBA1C_IFCC in mmol/mol)
    lab_b_payload = {
        "report_id": "REP-LBB-002",
        "source_patient_id": "TX-9981",
        "patient_demographics": {
            "name": "R. Kumar",
            "dob": "14/03/1968",
            "gender": "M",
            "phone": None,
            "pincode": "570001",
        },
        "panels": [
            {
                "panel_name": "IFCC Glycemic Panel",
                "collected_at": "2026-08-15T09:10:00Z",
                "results": [
                    {
                        "local_code": "HBA1C_IFCC",
                        "test_name": "HbA1c IFCC",
                        "value": 63,
                        "unit": "mmol/mol",
                    },
                ],
            }
        ],
    }

    src_a, obs_a = adapt_lab_report(lab_a_payload)
    src_b, obs_b = adapt_lab_report(lab_b_payload)

    # Check Lab A observations
    hba1c_a = next(o for o in obs_a if o.local_code == "GLYCO HB")
    assert hba1c_a.loinc_code == "4548-4"
    assert hba1c_a.value == 8.4
    assert hba1c_a.unit == "%"
    assert hba1c_a.normalized is True

    fbs_a = next(o for o in obs_a if o.local_code == "FBS")
    assert fbs_a.loinc_code == "1558-6"
    assert fbs_a.unit == "mg/dL"
    assert fbs_a.value == 134.0

    # Check Lab B HbA1c conversion to % series
    hba1c_b = next(o for o in obs_b if o.local_code == "HBA1C_IFCC")
    assert hba1c_b.loinc_code == "4548-4"
    # 63 mmol/mol converted to % via 0.0915 * 63 + 2.15 = 7.91%
    assert hba1c_b.value == 7.91
    assert hba1c_b.unit == "%"
    assert hba1c_b.raw_value == 63.0
    assert hba1c_b.raw_unit == "mmol/mol"
    assert hba1c_b.normalized is True


def test_unmapped_codes_kept_with_normalized_false():
    """Verify unmapped lab codes or brands remain with normalized=False."""
    # Unknown lab code
    loinc, val, unit, is_norm = normalize_lab_observation(
        local_code="CUSTOM_UNKNOWN_BIOMARKER_XYZ",
        test_name="Experimental Marker",
        raw_value=45.2,
        raw_unit="pg/mL",
    )
    assert loinc is None
    assert val == 45.2
    assert unit == "pg/mL"
    assert is_norm is False

    # Unknown medication brand
    brand, generic, dosage, drug_class, med_norm = normalize_medication("UnknownHerbalExtract 200")
    assert generic == "UnknownHerbalExtract 200"
    assert med_norm is False


def test_adapt_pharmacy_dispense():
    """Verify Pharmacy adapter parses dispensation into Medication entity."""
    disp_sample = {
        "dispense_id": "DISP-8810",
        "pharmacy_system": "MedPlus Retail Pharmacy",
        "patient_id": "PH-30991",
        "patient_name": "Ramesh Kumaar",
        "dob": "1968-03-14",
        "phone": "90000 12345",
        "pincode": "570001",
        "brand_name": "Glycomet 500",
        "dosage": "500 mg",
        "quantity": 30,
        "dispensed_date": "2026-06-15T11:20:00Z",
        "pharmacist_id": "pharm.imran",
    }

    src_rec, med = adapt_pharmacy_dispense(disp_sample)
    assert src_rec.source == "pharmacy"
    assert src_rec.source_record_id == "PH-30991"
    assert src_rec.patient_name == "Ramesh Kumaar"

    assert med.medication_id == "DISP-8810"
    assert med.brand_name == "Glycomet 500"
    assert med.generic_name == "metformin"
    assert med.dosage == "500 mg"
    assert med.quantity == 30
    assert med.drug_class == "biguanide"
    assert med.normalized is True


def test_adapt_insurer_claim():
    """Verify Insurer adapter parses claims payload."""
    claim_bundle = {
        "insurer_name": "Star Health",
        "policyholder_id": "STAR-48221",
        "patient_name": "R. Kumar",
        "dob": "1968-03-14",
        "gender": "male",
        "phone": "90000 12345",
        "pincode": "570001",
        "policy_number": "SH-DIAB-2026-901",
        "claims": [
            {
                "claim_id": "CLM-4011",
                "service_date": "2026-06-12T00:00:00Z",
                "claimed_amount": 1450.00,
                "approved_amount": 1450.00,
                "status": "APPROVED",
                "category": "OPD_CONSULT",
                "description": "Diabetic consultation",
            }
        ],
    }

    src_rec, claims = adapt_insurer_claim(claim_bundle)
    assert src_rec.source == "claims"
    assert src_rec.source_record_id == "STAR-48221"
    assert len(claims) == 1
    assert claims[0].claim_id == "CLM-4011"
    assert claims[0].claimed_amount == 1450.00
    assert claims[0].status == "APPROVED"
