"""Synthetic clinical data generator implementing Section 8 of the specification."""

import csv
import json
import random
from pathlib import Path
from typing import Any, Dict

from faker import Faker

DATA_DIR = Path(__file__).resolve().parent / "data"

# Fixed seed for reproducibility
RANDOM_SEED = 42


def generate_all_datasets() -> Dict[str, Any]:
    """Generate the four source system datasets and persist them to data/."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    random.seed(RANDOM_SEED)
    fake = Faker("en_IN")
    fake.seed_instance(RANDOM_SEED)

    # 1. Build Hero Patient Ramesh Kumar across all systems
    # EHR: APL-004512
    ehr_hero_patient = {
        "resourceType": "Bundle",
        "id": "APL-004512-BUNDLE",
        "type": "collection",
        "entry": [
            {
                "resource": {
                    "resourceType": "Patient",
                    "id": "APL-004512",
                    "identifier": [{"system": "apollo_ehr", "value": "APL-004512"}],
                    "name": [{"text": "Ramesh Kumar", "family": "Kumar", "given": ["Ramesh"]}],
                    "gender": "male",
                    "birthDate": "1968-03-14",
                    "telecom": [{"system": "phone", "value": "90000 12345"}],
                    "address": [{"city": "Mysuru", "postalCode": "570001", "state": "Karnataka"}],
                }
            },
            {
                "resource": {
                    "resourceType": "Condition",
                    "id": "COND-001",
                    "subject": {"reference": "Patient/APL-004512"},
                    "code": {
                        "text": "Type 2 diabetes mellitus",
                        "coding": [{"code": "E11", "display": "Type 2 diabetes mellitus"}],
                    },
                    "recordedDate": "2026-05-10T10:00:00Z",
                }
            },
            {
                "resource": {
                    "resourceType": "Condition",
                    "id": "COND-002",
                    "subject": {"reference": "Patient/APL-004512"},
                    "code": {
                        "text": "Essential hypertension",
                        "coding": [{"code": "I10", "display": "Essential hypertension"}],
                    },
                    "recordedDate": "2026-05-10T10:00:00Z",
                }
            },
            {
                "resource": {
                    "resourceType": "AllergyIntolerance",
                    "id": "ALLERGY-001",
                    "subject": {"reference": "Patient/APL-004512"},
                    "clinicalStatus": "active",
                    "criticality": "high",
                    "substance": {"text": "Penicillin", "class": "penicillin"},
                    "reaction": [
                        {"manifestation": [{"text": "Anaphylaxis and generalized urticaria"}]}
                    ],
                    "recordedDate": "2026-05-10T10:15:00Z",
                }
            },
            {
                "resource": {
                    "resourceType": "Encounter",
                    "id": "ENC-001",
                    "subject": {"reference": "Patient/APL-004512"},
                    "period": {"start": "2026-05-10T09:30:00Z", "end": "2026-05-10T10:30:00Z"},
                    "reasonCode": [
                        {"text": "Initial comprehensive diabetes & hypertension consult"}
                    ],
                }
            },
            {
                "resource": {
                    "resourceType": "Encounter",
                    "id": "ENC-002",
                    "subject": {"reference": "Patient/APL-004512"},
                    "period": {"start": "2026-08-01T11:00:00Z", "end": "2026-08-01T11:45:00Z"},
                    "reasonCode": [{"text": "Routine diabetic review & blood pressure check"}],
                }
            },
            {
                "resource": {
                    "resourceType": "Encounter",
                    "id": "ENC-003",
                    "subject": {"reference": "Patient/APL-004512"},
                    "period": {"start": "2026-09-14T10:00:00Z", "end": "2026-09-14T10:40:00Z"},
                    "reasonCode": [{"text": "Quarterly metabolic follow-up & lab orders"}],
                }
            },
            {
                "resource": {
                    "resourceType": "MedicationRequest",
                    "id": "MED-001",
                    "subject": {"reference": "Patient/APL-004512"},
                    "medicationCodeableConcept": {
                        "text": "metformin 500mg",
                        "generic": "metformin",
                    },
                    "authoredOn": "2026-05-10T10:20:00Z",
                }
            },
            {
                "resource": {
                    "resourceType": "MedicationRequest",
                    "id": "MED-002",
                    "subject": {"reference": "Patient/APL-004512"},
                    "medicationCodeableConcept": {
                        "text": "telmisartan 40mg",
                        "generic": "telmisartan",
                    },
                    "authoredOn": "2026-05-10T10:20:00Z",
                }
            },
            # NOTE: Atorva 10 is deliberately NOT prescribed in EHR
            # to create the planted reconciliation discrepancy
        ],
    }

    # Lab A: LB-77120 (Local codes, %, fasting glucose mg/dL, lipid panel 14 Sep)
    lab_a_hero = {
        "report_id": "REP-LBA-9910",
        "lab_system": "Lab A Diagnostics (Mysuru Central)",
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
                "panel_name": "Diabetes Biomarkers Q2",
                "collected_at": "2026-06-10T08:00:00Z",
                "results": [
                    {
                        "local_code": "GLYCO HB",
                        "test_name": "Glycated Hemoglobin",
                        "value": 8.4,
                        "unit": "%",
                        "flag": "HIGH",
                    },
                    {
                        "local_code": "FBS",
                        "test_name": "Fasting Blood Sugar",
                        "value": 142,
                        "unit": "mg/dL",
                        "flag": "HIGH",
                    },
                ],
            },
            {
                "panel_name": "Diabetes Biomarkers Q3",
                "collected_at": "2026-09-12T07:45:00Z",
                "results": [
                    {
                        "local_code": "GLYCO HB",
                        "test_name": "Glycated Hemoglobin",
                        "value": 7.9,
                        "unit": "%",
                        "flag": "HIGH",
                    },
                    {
                        "local_code": "FBS",
                        "test_name": "Fasting Blood Sugar",
                        "value": 134,
                        "unit": "mg/dL",
                        "flag": "HIGH",
                    },
                ],
            },
            {
                "panel_name": "Lipid Profile Standard",
                "collected_at": "2026-09-14T08:15:00Z",
                "results": [
                    {
                        "local_code": "CHOL_TOTAL",
                        "test_name": "Total Cholesterol",
                        "value": 195,
                        "unit": "mg/dL",
                        "flag": "NORMAL",
                    },
                    {
                        "local_code": "HDL",
                        "test_name": "HDL Cholesterol",
                        "value": 42,
                        "unit": "mg/dL",
                        "flag": "NORMAL",
                    },
                    {
                        "local_code": "LDL",
                        "test_name": "LDL Cholesterol",
                        "value": 125,
                        "unit": "mg/dL",
                        "flag": "ELEVATED",
                    },
                    {
                        "local_code": "TRIG",
                        "test_name": "Triglycerides",
                        "value": 140,
                        "unit": "mg/dL",
                        "flag": "NORMAL",
                    },
                ],
            },
        ],
    }

    # Lab B: TX-9981 (HbA1c 63 mmol/mol Aug; duplicate lipid panel 24 Sep;
    # name variant R. Kumar; DOB variant 14/03/1968; ONE RECORD WITHOUT PHONE!)
    lab_b_hero = {
        "report_id": "REP-LBB-4421",
        "lab_system": "Lab B Thyrocare Reference",
        "source_patient_id": "TX-9981",
        "patient_demographics": {
            "name": "R. Kumar",  # Name variant
            "dob": "14/03/1968",  # DOB format variant
            "gender": "M",
            "phone": None,  # Planted issue: one record has no phone!
            "pincode": "570001",
        },
        "panels": [
            {
                "panel_name": "Glycemic Monitor Panel",
                "collected_at": "2026-08-15T09:10:00Z",
                "results": [
                    {
                        "local_code": "HBA1C_IFCC",
                        "test_name": "HbA1c (IFCC Standardization)",
                        "value": 63,
                        "unit": "mmol/mol",
                        "flag": "HIGH",
                    },
                ],
            },
            {
                "panel_name": "Complete Lipid Screen",
                # Planted issue: duplicate lipid panel within 10 days of Lab A 14 Sep
                "collected_at": "2026-09-24T08:30:00Z",
                "results": [
                    {
                        "local_code": "TOTAL_CHOLESTEROL",
                        "test_name": "Cholesterol Total",
                        "value": 190,
                        "unit": "mg/dL",
                        "flag": "NORMAL",
                    },
                    {
                        "local_code": "HDL_C",
                        "test_name": "High Density Lipoprotein",
                        "value": 41,
                        "unit": "mg/dL",
                        "flag": "NORMAL",
                    },
                    {
                        "local_code": "LDL_C",
                        "test_name": "Low Density Lipoprotein",
                        "value": 122,
                        "unit": "mg/dL",
                        "flag": "ELEVATED",
                    },
                    {
                        "local_code": "TG",
                        "test_name": "Triglycerides",
                        "value": 135,
                        "unit": "mg/dL",
                        "flag": "NORMAL",
                    },
                ],
            },
        ],
    }

    # Pharmacy: PH-30991 (Brand names, Glycomet 500 once in June, Mox 500 in Sept
    # [allergy conflict], Atorva 10 dispensed [EHR conflict], Name variant Ramesh Kumaar)
    pharmacy_hero_rows = [
        {
            "dispense_id": "DISP-8810",
            "pharmacy_system": "MedPlus Retail Pharmacy Mysuru",
            "patient_id": "PH-30991",
            "patient_name": "Ramesh Kumaar",  # Name variant
            "dob": "1968-03-14",
            "phone": "90000 12345",
            "pincode": "570001",
            "brand_name": "Glycomet 500",  # Metformin dispensed once in June
            "dosage": "500 mg",
            "quantity": 30,
            "dispensed_date": "2026-06-15T11:20:00Z",
            "pharmacist_id": "pharm.imran",
            "notes": "Patient advised regarding dietary intake with metformin.",
        },
        {
            "dispense_id": "DISP-8892",
            "pharmacy_system": "MedPlus Retail Pharmacy Mysuru",
            "patient_id": "PH-30991",
            "patient_name": "Ramesh Kumaar",
            "dob": "1968-03-14",
            "phone": "90000 12345",
            "pincode": "570001",
            "brand_name": "Atorva 10",  # Planted issue: dispensed but missing from EHR!
            "dosage": "10 mg",
            "quantity": 30,
            "dispensed_date": "2026-07-20T17:10:00Z",
            "pharmacist_id": "pharm.imran",
            "notes": "Statin therapy dispensation.",
        },
        {
            "dispense_id": "DISP-9104",
            "pharmacy_system": "MedPlus Retail Pharmacy Mysuru",
            "patient_id": "PH-30991",
            "patient_name": "Ramesh Kumaar",
            "dob": "1968-03-14",
            "phone": "90000 12345",
            "pincode": "570001",
            # Planted issue: amoxicillin dispensed in Sept, allergy conflict!
            "brand_name": "Mox 500",
            "dosage": "500 mg",
            "quantity": 10,
            "dispensed_date": "2026-09-16T14:40:00Z",
            "pharmacist_id": "pharm.imran",
            "notes": "Dispensed for upper respiratory symptoms.",
        },
    ]

    # Insurer: STAR-48221 (Star Health Claims, two claims: one approved, one pending,
    # name R. Kumar, DOB 1968-03-14)
    insurer_hero = {
        "insurer_name": "Star Health & Allied Insurance",
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
                "category": "OPD_CONSULT_AND_LABS",
                "description": "Diabetic evaluation and Glycated Hb diagnostic workup",
            },
            {
                "claim_id": "CLM-4890",
                "service_date": "2026-09-20T00:00:00Z",
                "claimed_amount": 2800.00,
                "approved_amount": 0.00,
                "status": "PENDING",
                "category": "SPECIALIST_REVIEW",
                "description": "Endocrinology consultation and multi-system medication review",
            },
        ],
    }

    # 2. Build 9 Faker Patients (Indian names, 2-4 systems each, fake phone 90000 xxxxx)
    faker_patients = []
    ehr_faker_entries = []
    lab_faker_entries = []
    pharmacy_faker_rows = []
    claims_faker_entries = []

    faker_configs = [
        {
            "name": "Ananya Deshmukh",
            "dob": "1984-06-22",
            "gender": "female",
            "city": "Bengaluru",
            "pincode": "560002",
            "phone": "90000 21001",
            "systems": ["ehr", "lab", "pharmacy", "claims"],
        },
        {
            "name": "Vikramaditya Rao",
            "dob": "1972-11-04",
            "gender": "male",
            "city": "Hyderabad",
            "pincode": "500034",
            "phone": "90000 21002",
            "systems": ["ehr", "lab", "pharmacy"],
        },
        {
            "name": "Kavita Subramanian",
            "dob": "1991-02-18",
            "gender": "female",
            "city": "Chennai",
            "pincode": "600001",
            "phone": "90000 21003",
            "systems": ["ehr", "lab", "claims"],
        },
        {
            "name": "Arjun Singhania",
            "dob": "1965-09-30",
            "gender": "male",
            "city": "Mumbai",
            "pincode": "400001",
            "phone": "90000 21004",
            "systems": ["ehr", "pharmacy", "claims"],
        },
        {
            "name": "Meera Nambiar",
            "dob": "1988-12-14",
            "gender": "female",
            "city": "Kochi",
            "pincode": "682001",
            "phone": "90000 21005",
            "systems": ["lab", "pharmacy"],
        },
        {
            "name": "Deepak Ganguly",
            "dob": "1979-04-09",
            "gender": "male",
            "city": "Kolkata",
            "pincode": "700001",
            "phone": "90000 21006",
            "systems": ["ehr", "lab", "pharmacy"],
        },
        {
            "name": "Pooja Hegde",
            "dob": "1995-07-25",
            "gender": "female",
            "city": "Mangaluru",
            "pincode": "575001",
            "phone": "90000 21007",
            "systems": ["ehr", "claims"],
        },
        {
            "name": "Rajeshwari Iyer",
            "dob": "1960-01-19",
            "gender": "female",
            "city": "Coimbatore",
            "pincode": "641001",
            "phone": "90000 21008",
            "systems": ["ehr", "lab", "pharmacy", "claims"],
        },
        {
            "name": "Tariq Mansoori",
            "dob": "1982-10-08",
            "gender": "male",
            "city": "Lucknow",
            "pincode": "226001",
            "phone": "90000 21009",
            "systems": ["lab", "pharmacy", "claims"],
        },
    ]

    for idx, p in enumerate(faker_configs, start=1):
        faker_patients.append(p)

        if "ehr" in p["systems"]:
            ehr_id = f"APL-FAK-{idx:04d}"
            ehr_bundle = {
                "resourceType": "Bundle",
                "id": f"{ehr_id}-BUNDLE",
                "type": "collection",
                "entry": [
                    {
                        "resource": {
                            "resourceType": "Patient",
                            "id": ehr_id,
                            "identifier": [{"system": "apollo_ehr", "value": ehr_id}],
                            "name": [{"text": p["name"]}],
                            "gender": p["gender"],
                            "birthDate": p["dob"],
                            "telecom": [{"system": "phone", "value": p["phone"]}],
                            "address": [{"city": p["city"], "postalCode": p["pincode"]}],
                        }
                    },
                    {
                        "resource": {
                            "resourceType": "Condition",
                            "id": f"COND-FAK-{idx}",
                            "subject": {"reference": f"Patient/{ehr_id}"},
                            "code": {"text": "Essential hypertension"},
                            "recordedDate": "2026-06-01T10:00:00Z",
                        }
                    },
                    {
                        "resource": {
                            "resourceType": "MedicationRequest",
                            "id": f"MED-FAK-{idx}",
                            "subject": {"reference": f"Patient/{ehr_id}"},
                            "medicationCodeableConcept": {
                                "text": "Telma 40",
                                "generic": "telmisartan",
                            },
                            "authoredOn": "2026-06-01T10:15:00Z",
                        }
                    },
                ],
            }
            ehr_faker_entries.append(ehr_bundle)

        if "lab" in p["systems"]:
            lab_id = f"LB-FAK-{idx:04d}"
            lab_entry = {
                "report_id": f"REP-FAK-{idx}",
                "lab_system": "Standard Lab Diagnostics",
                "source_patient_id": lab_id,
                "patient_demographics": {
                    "name": p["name"],
                    "dob": p["dob"],
                    "gender": p["gender"],
                    "phone": p["phone"],
                    "pincode": p["pincode"],
                },
                "panels": [
                    {
                        "panel_name": "Routine Screening",
                        "collected_at": "2026-06-15T08:00:00Z",
                        "results": [
                            {
                                "local_code": "FBS",
                                "test_name": "Fasting Blood Sugar",
                                "value": random.randint(90, 115),
                                "unit": "mg/dL",
                                "flag": "NORMAL",
                            },
                            {
                                "local_code": "CHOL_TOTAL",
                                "test_name": "Total Cholesterol",
                                "value": random.randint(160, 210),
                                "unit": "mg/dL",
                                "flag": "NORMAL",
                            },
                        ],
                    }
                ],
            }
            lab_faker_entries.append(lab_entry)

        if "pharmacy" in p["systems"]:
            pharm_id = f"PH-FAK-{idx:04d}"
            pharmacy_faker_rows.append(
                {
                    "dispense_id": f"DISP-FAK-{idx}",
                    "pharmacy_system": "MedPlus Retail Pharmacy",
                    "patient_id": pharm_id,
                    "patient_name": p["name"],
                    "dob": p["dob"],
                    "phone": p["phone"],
                    "pincode": p["pincode"],
                    "brand_name": "Telma 40",
                    "dosage": "40 mg",
                    "quantity": 30,
                    "dispensed_date": "2026-06-20T12:00:00Z",
                    "pharmacist_id": "pharm.imran",
                    "notes": "Regular dispensation.",
                }
            )

        if "claims" in p["systems"]:
            claim_id = f"STAR-FAK-{idx:04d}"
            claims_faker_entries.append(
                {
                    "insurer_name": "Star Health & Allied Insurance",
                    "policyholder_id": claim_id,
                    "patient_name": p["name"],
                    "dob": p["dob"],
                    "gender": p["gender"],
                    "phone": p["phone"],
                    "pincode": p["pincode"],
                    "policy_number": f"SH-STD-2026-{idx:03d}",
                    "claims": [
                        {
                            "claim_id": f"CLM-FAK-{idx}",
                            "service_date": "2026-07-01T00:00:00Z",
                            "claimed_amount": 1200.00,
                            "approved_amount": 1200.00,
                            "status": "APPROVED",
                            "category": "OPD_CONSULT",
                            "description": "Routine medical checkup and prescription cover",
                        }
                    ],
                }
            )

    # 3. Build 2 Deliberately Ambiguous Pairs (same name, different DOB or pincode)
    # that MUST NOT auto-link
    # Ambiguous Pair 1: "Suresh Patel" - same name, DIFFERENT DOB
    amb_pair_1a = {
        "name": "Suresh Patel",
        "dob": "1974-05-12",
        "gender": "male",
        "city": "Ahmedabad",
        "pincode": "380001",
        "phone": "90000 33001",
    }
    amb_pair_1b = {
        "name": "Suresh Patel",
        "dob": "1985-09-20",  # Different DOB!
        "gender": "male",
        "city": "Ahmedabad",
        "pincode": "380001",
        "phone": "90000 33001",
    }

    # Ambiguous Pair 2: "Priya Sharma" - same name, same DOB year, DIFFERENT PINCODE & PHONE
    amb_pair_2a = {
        "name": "Priya Sharma",
        "dob": "1990-08-15",
        "gender": "female",
        "city": "Delhi",
        "pincode": "110001",
        "phone": "90000 44001",
    }
    amb_pair_2b = {
        "name": "Priya Sharma",
        "dob": "1990-08-15",
        "gender": "female",
        "city": "Bengaluru",
        "pincode": "560001",  # Different pincode!
        "phone": "90000 44002",  # Different phone!
    }

    # Add ambiguous pairs to EHR and Lab datasets
    ehr_amb_1 = {
        "resourceType": "Bundle",
        "id": "APL-AMB-01A-BUNDLE",
        "type": "collection",
        "entry": [
            {
                "resource": {
                    "resourceType": "Patient",
                    "id": "APL-AMB-01A",
                    "identifier": [{"system": "apollo_ehr", "value": "APL-AMB-01A"}],
                    "name": [{"text": amb_pair_1a["name"]}],
                    "gender": amb_pair_1a["gender"],
                    "birthDate": amb_pair_1a["dob"],
                    "telecom": [{"system": "phone", "value": amb_pair_1a["phone"]}],
                    "address": [
                        {"city": amb_pair_1a["city"], "postalCode": amb_pair_1a["pincode"]}
                    ],
                }
            }
        ],
    }
    ehr_amb_2 = {
        "resourceType": "Bundle",
        "id": "APL-AMB-02A-BUNDLE",
        "type": "collection",
        "entry": [
            {
                "resource": {
                    "resourceType": "Patient",
                    "id": "APL-AMB-02A",
                    "identifier": [{"system": "apollo_ehr", "value": "APL-AMB-02A"}],
                    "name": [{"text": amb_pair_2a["name"]}],
                    "gender": amb_pair_2a["gender"],
                    "birthDate": amb_pair_2a["dob"],
                    "telecom": [{"system": "phone", "value": amb_pair_2a["phone"]}],
                    "address": [
                        {"city": amb_pair_2a["city"], "postalCode": amb_pair_2a["pincode"]}
                    ],
                }
            }
        ],
    }
    lab_amb_1 = {
        "report_id": "REP-AMB-01B",
        "lab_system": "Lab A Diagnostics",
        "source_patient_id": "LB-AMB-01B",
        "patient_demographics": amb_pair_1b,
        "panels": [
            {
                "panel_name": "Basic Panel",
                "collected_at": "2026-07-10T08:00:00Z",
                "results": [
                    {
                        "local_code": "FBS",
                        "test_name": "Fasting Blood Sugar",
                        "value": 98,
                        "unit": "mg/dL",
                        "flag": "NORMAL",
                    }
                ],
            }
        ],
    }
    lab_amb_2 = {
        "report_id": "REP-AMB-02B",
        "lab_system": "Lab A Diagnostics",
        "source_patient_id": "LB-AMB-02B",
        "patient_demographics": amb_pair_2b,
        "panels": [
            {
                "panel_name": "Basic Panel",
                "collected_at": "2026-07-10T08:00:00Z",
                "results": [
                    {
                        "local_code": "FBS",
                        "test_name": "Fasting Blood Sugar",
                        "value": 102,
                        "unit": "mg/dL",
                        "flag": "NORMAL",
                    }
                ],
            }
        ],
    }

    # -------------------------------------------------------------------------
    # 4. Neighbourhood Extension: 2 clinics, 3 pharmacies, 1 lab, 11 patients
    # -------------------------------------------------------------------------
    # Demo scenario 1: Priya Nair — penicillin allergy (clinic EHR) +
    #                  Augmentin 625 dispensed at Chemist Corner (DIFFERENT pharmacy)
    # Demo scenario 2: Suresh Pai — diabetic, Metformin last dispensed >20 days ago
    # Demo scenario 3: Kavitha Rao — visiting second clinic with no shared history
    # (Ramesh Kumar remains scenario 4: Atorvastatin dispensed but missing from EHR)

    neighbourhood_ehr_entries = []
    neighbourhood_pharmacy_rows = []
    neighbourhood_lab_entries = []

    # --- Scenario 1: Priya Nair ---
    priya_ehr = {
        "resourceType": "Bundle",
        "id": "HP-001-BUNDLE",
        "type": "collection",
        "entry": [
            {
                "resource": {
                    "resourceType": "Patient",
                    "id": "HP-001",
                    "identifier": [{"system": "healthpoint_clinic", "value": "HP-001"}],
                    "name": [{"text": "Priya Nair", "family": "Nair", "given": ["Priya"]}],
                    "gender": "female",
                    "birthDate": "1992-07-22",
                    "telecom": [{"system": "phone", "value": "90000 55001"}],
                    "address": [{"city": "Mysuru", "postalCode": "570002", "state": "Karnataka"}],
                }
            },
            {
                "resource": {
                    "resourceType": "Condition",
                    "id": "HP-COND-001",
                    "subject": {"reference": "Patient/HP-001"},
                    "code": {
                        "text": "Recurrent sinusitis",
                        "coding": [{"code": "J32", "display": "Chronic sinusitis"}],
                    },
                    "recordedDate": "2026-08-05T10:00:00Z",
                }
            },
            {
                "resource": {
                    "resourceType": "AllergyIntolerance",
                    "id": "HP-ALLERGY-001",
                    "subject": {"reference": "Patient/HP-001"},
                    "clinicalStatus": "active",
                    "criticality": "high",
                    "substance": {"text": "Penicillin", "class": "penicillin"},
                    "reaction": [{"manifestation": [{"text": "Hives and throat swelling"}]}],
                    "recordedDate": "2026-08-05T10:10:00Z",
                }
            },
            {
                "resource": {
                    "resourceType": "MedicationRequest",
                    "id": "HP-MED-001",
                    "subject": {"reference": "Patient/HP-001"},
                    "medicationCodeableConcept": {"text": "Telma 40", "generic": "telmisartan"},
                    "authoredOn": "2026-08-05T10:20:00Z",
                }
            },
        ],
    }
    neighbourhood_ehr_entries.append(priya_ehr)

    # Priya goes to Chemist Corner (different pharmacy) and gets Augmentin — ALLERGY CONFLICT!
    neighbourhood_pharmacy_rows.extend(
        [
            {
                "dispense_id": "CC-DISP-0021",
                "pharmacy_system": "Chemist Corner Mysuru",
                "patient_id": "CC-PRIYA-001",
                "patient_name": "Priya Nair",
                "dob": "1992-07-22",
                "phone": "90000 55001",
                "pincode": "570002",
                "brand_name": "Augmentin 625",
                "dosage": "625 mg",
                "quantity": 14,
                "days_supply": 7,
                "dispensed_date": "2026-10-01T16:30:00Z",
                "pharmacist_id": "pharm.imran",
                "notes": "Dispensed for acute sinusitis — NO allergy check performed.",
            }
        ]
    )

    # --- Scenario 2: Suresh Pai — overdue metformin refill ---
    suresh_ehr = {
        "resourceType": "Bundle",
        "id": "APL-002-BUNDLE",
        "type": "collection",
        "entry": [
            {
                "resource": {
                    "resourceType": "Patient",
                    "id": "APL-SP-002",
                    "identifier": [{"system": "apollo_ehr", "value": "APL-SP-002"}],
                    "name": [{"text": "Suresh Pai", "family": "Pai", "given": ["Suresh"]}],
                    "gender": "male",
                    "birthDate": "1963-11-30",
                    "telecom": [{"system": "phone", "value": "90000 55002"}],
                    "address": [{"city": "Mysuru", "postalCode": "570004", "state": "Karnataka"}],
                }
            },
            {
                "resource": {
                    "resourceType": "Condition",
                    "id": "APL-SP-COND-001",
                    "subject": {"reference": "Patient/APL-SP-002"},
                    "code": {
                        "text": "Type 2 diabetes mellitus",
                        "coding": [{"code": "E11", "display": "Type 2 diabetes mellitus"}],
                    },
                    "recordedDate": "2026-04-15T09:00:00Z",
                }
            },
            {
                "resource": {
                    "resourceType": "MedicationRequest",
                    "id": "APL-SP-MED-001",
                    "subject": {"reference": "Patient/APL-SP-002"},
                    "medicationCodeableConcept": {
                        "text": "metformin 500mg",
                        "generic": "metformin",
                    },
                    "authoredOn": "2026-04-15T09:30:00Z",
                }
            },
        ],
    }
    neighbourhood_ehr_entries.append(suresh_ehr)

    # Suresh last filled metformin 23 days ago (days_supply=30) → overdue
    neighbourhood_pharmacy_rows.append(
        {
            "dispense_id": "MP-DISP-3301",
            "pharmacy_system": "MedPlus Retail Pharmacy Mysuru",
            "patient_id": "PH-SP-002",
            "patient_name": "Suresh Pai",
            "dob": "1963-11-30",
            "phone": "90000 55002",
            "pincode": "570004",
            "brand_name": "Glycomet 500",
            "dosage": "500 mg",
            "quantity": 60,
            "days_supply": 30,
            "dispensed_date": "2026-08-20T11:00:00Z",  # Dispensed ~54d ago; ~24d overdue on Oct 13
            "pharmacist_id": "pharm.imran",
            "notes": "Routine refill — patient did not return after 30 days.",
        }
    )

    # --- Scenario 3: Kavitha Rao — new to second clinic, no shared history ---
    kavitha_ehr_clinic1 = {
        "resourceType": "Bundle",
        "id": "HP-003-BUNDLE",
        "type": "collection",
        "entry": [
            {
                "resource": {
                    "resourceType": "Patient",
                    "id": "HP-003",
                    "identifier": [{"system": "healthpoint_clinic", "value": "HP-003"}],
                    "name": [{"text": "Kavitha Rao", "family": "Rao", "given": ["Kavitha"]}],
                    "gender": "female",
                    "birthDate": "1985-04-10",
                    "telecom": [{"system": "phone", "value": "90000 55003"}],
                    "address": [{"city": "Mysuru", "postalCode": "570001", "state": "Karnataka"}],
                }
            },
            {
                "resource": {
                    "resourceType": "Condition",
                    "id": "HP-003-COND-001",
                    "subject": {"reference": "Patient/HP-003"},
                    "code": {
                        "text": "Hypothyroidism",
                        "coding": [{"code": "E03", "display": "Hypothyroidism"}],
                    },
                    "recordedDate": "2026-03-01T10:00:00Z",
                }
            },
        ],
    }
    neighbourhood_ehr_entries.append(kavitha_ehr_clinic1)

    # Kavitha visits Apollo Clinic (second clinic) — appears as a new patient
    kavitha_ehr_clinic2 = {
        "resourceType": "Bundle",
        "id": "APL-004-BUNDLE",
        "type": "collection",
        "entry": [
            {
                "resource": {
                    "resourceType": "Patient",
                    "id": "APL-KR-004",
                    "identifier": [{"system": "apollo_ehr", "value": "APL-KR-004"}],
                    "name": [{"text": "K. Rao"}],  # Name variant — engine must score carefully
                    "gender": "female",
                    "birthDate": "1985-04-10",
                    "telecom": [{"system": "phone", "value": "90000 55003"}],
                    "address": [{"city": "Mysuru", "postalCode": "570001", "state": "Karnataka"}],
                }
            },
        ],
    }
    neighbourhood_ehr_entries.append(kavitha_ehr_clinic2)

    # --- Remaining neighbourhood patients (simple, 1-2 systems) ---
    neighbourhood_configs = [
        {
            "name": "Ravi Shankar",
            "dob": "1970-06-15",
            "gender": "male",
            "phone": "90000 55004",
            "pincode": "570003",
        },
        {
            "name": "Lakshmi Bai",
            "dob": "1955-09-01",
            "gender": "female",
            "phone": "90000 55005",
            "pincode": "570005",
        },
        {
            "name": "Mohammed Irfan",
            "dob": "1988-02-28",
            "gender": "male",
            "phone": "90000 55006",
            "pincode": "570006",
        },
        {
            "name": "Geetha Krishnan",
            "dob": "1978-12-20",
            "gender": "female",
            "phone": "90000 55007",
            "pincode": "570001",
        },
        {
            "name": "Basavaraj Patil",
            "dob": "1945-03-05",
            "gender": "male",
            "phone": "90000 55008",
            "pincode": "570008",
        },
        {
            "name": "Nandini Shetty",
            "dob": "1998-11-11",
            "gender": "female",
            "phone": "90000 55009",
            "pincode": "570009",
        },
        {
            "name": "Harish Naik",
            "dob": "1965-07-04",
            "gender": "male",
            "phone": "90000 55010",
            "pincode": "570010",
        },
    ]
    for idx, nc in enumerate(neighbourhood_configs, start=10):
        n_ehr_id = f"APL-NBR-{idx:04d}"
        neighbourhood_ehr_entries.append(
            {
                "resourceType": "Bundle",
                "id": f"{n_ehr_id}-BUNDLE",
                "type": "collection",
                "entry": [
                    {
                        "resource": {
                            "resourceType": "Patient",
                            "id": n_ehr_id,
                            "identifier": [{"system": "apollo_ehr", "value": n_ehr_id}],
                            "name": [{"text": nc["name"]}],
                            "gender": nc["gender"],
                            "birthDate": nc["dob"],
                            "telecom": [{"system": "phone", "value": nc["phone"]}],
                            "address": [
                                {
                                    "city": "Mysuru",
                                    "postalCode": nc["pincode"],
                                    "state": "Karnataka",
                                }
                            ],
                        }
                    }
                ],
            }
        )
        neighbourhood_pharmacy_rows.append(
            {
                "dispense_id": f"AP-DISP-NBR-{idx}",
                "pharmacy_system": "Apollo Pharmacy Mysuru",
                "patient_id": f"AP-NBR-{idx:04d}",
                "patient_name": nc["name"],
                "dob": nc["dob"],
                "phone": nc["phone"],
                "pincode": nc["pincode"],
                "brand_name": "Amlodac 5",
                "dosage": "5 mg",
                "quantity": 30,
                "days_supply": 30,
                "dispensed_date": "2026-09-01T10:00:00Z",
                "pharmacist_id": "pharm.imran",
                "notes": "Routine dispensation.",
            }
        )

    # -------------------------------------------------------------------------
    # Aggregate all datasets (neighbourhood appended AFTER existing data)
    # -------------------------------------------------------------------------
    all_ehr = (
        [ehr_hero_patient] + ehr_faker_entries + [ehr_amb_1, ehr_amb_2] + neighbourhood_ehr_entries
    )
    all_lab = (
        [lab_a_hero, lab_b_hero]
        + lab_faker_entries
        + [lab_amb_1, lab_amb_2]
        + neighbourhood_lab_entries
    )
    all_pharmacy = pharmacy_hero_rows + pharmacy_faker_rows + neighbourhood_pharmacy_rows
    all_claims = [insurer_hero] + claims_faker_entries

    # Persist JSON and CSV datasets
    ehr_path = DATA_DIR / "ehr_records.json"
    with open(ehr_path, "w", encoding="utf-8") as f:
        json.dump(all_ehr, f, indent=2)

    lab_path = DATA_DIR / "lab_records.json"
    with open(lab_path, "w", encoding="utf-8") as f:
        json.dump(all_lab, f, indent=2)

    pharm_json_path = DATA_DIR / "pharmacy_records.json"
    with open(pharm_json_path, "w", encoding="utf-8") as f:
        json.dump(all_pharmacy, f, indent=2)

    pharm_csv_path = DATA_DIR / "pharmacy_records.csv"
    if all_pharmacy:
        # Use union of all keys so old rows (no days_supply) and new rows both serialize
        all_keys: list[str] = []
        seen_keys: set[str] = set()
        for row in all_pharmacy:
            for k in row.keys():
                if k not in seen_keys:
                    all_keys.append(k)
                    seen_keys.add(k)
        with open(pharm_csv_path, "w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=all_keys, extrasaction="ignore", restval="")
            writer.writeheader()
            writer.writerows(all_pharmacy)

    claims_path = DATA_DIR / "claims_records.json"
    with open(claims_path, "w", encoding="utf-8") as f:
        json.dump(all_claims, f, indent=2)

    return {
        "ehr": all_ehr,
        "lab": all_lab,
        "pharmacy": all_pharmacy,
        "claims": all_claims,
    }
