"""Clinical normalization dictionaries and conversion formulas per spec section 9."""

from typing import Any, Dict

# Standard LOINC-style laboratory codes
LOINC_CODES: Dict[str, Dict[str, Any]] = {
    "4548-4": {
        "name": "Hemoglobin A1c/Hemoglobin.total in Blood",
        "short_name": "HbA1c",
        "standard_unit": "%",
        "target_range": "< 7.0 %",
        "local_code_aliases": ["GLYCO HB", "HBA1C", "GLYCATED_HB", "GHB", "A1C"],
    },
    "1558-6": {
        "name": "Fasting Glucose in Serum/Plasma",
        "short_name": "Fasting Glucose",
        "standard_unit": "mg/dL",
        "target_range": "< 100 mg/dL",
        "local_code_aliases": ["FBS", "FASTING_BLOOD_SUGAR", "GLUCOSE_FASTING"],
    },
    "2093-3": {
        "name": "Cholesterol in Serum/Plasma",
        "short_name": "Total Cholesterol",
        "standard_unit": "mg/dL",
        "target_range": "< 200 mg/dL",
        "local_code_aliases": ["CHOL_TOTAL", "TOTAL_CHOLESTEROL", "CHOL"],
    },
    "2085-9": {
        "name": "Cholesterol in HDL in Serum/Plasma",
        "short_name": "HDL Cholesterol",
        "standard_unit": "mg/dL",
        "target_range": "> 40 mg/dL",
        "local_code_aliases": ["HDL", "HDL_C", "HDL_CHOLESTEROL"],
    },
    "13457-7": {
        "name": "Cholesterol in LDL in Serum/Plasma by calculation",
        "short_name": "LDL Cholesterol",
        "standard_unit": "mg/dL",
        "target_range": "< 100 mg/dL",
        "local_code_aliases": ["LDL", "LDL_C", "LDL_CHOLESTEROL"],
    },
    "2571-8": {
        "name": "Triglyceride in Serum/Plasma",
        "short_name": "Triglycerides",
        "standard_unit": "mg/dL",
        "target_range": "< 150 mg/dL",
        "local_code_aliases": ["TRIG", "TG", "TRIGLYCERIDES"],
    },
}

# Mapping from local test names/codes to LOINC
LOCAL_CODE_TO_LOINC: Dict[str, str] = {
    alias.upper(): loinc
    for loinc, data in LOINC_CODES.items()
    for alias in data["local_code_aliases"]
}

# Commercial brand medications in India mapped to generic active ingredients and drug classes
BRAND_MAPPINGS: Dict[str, Dict[str, str]] = {
    "Glycomet 500": {
        "generic": "metformin",
        "strength": "500 mg",
        "drug_class": "biguanide",
        "indication": "Type 2 Diabetes Mellitus",
    },
    "Telma 40": {
        "generic": "telmisartan",
        "strength": "40 mg",
        "drug_class": "angiotensin_receptor_blocker",
        "indication": "Hypertension",
    },
    "Atorva 10": {
        "generic": "atorvastatin",
        "strength": "10 mg",
        "drug_class": "statin",
        "indication": "Hyperlipidemia",
    },
    "Mox 500": {
        "generic": "amoxicillin",
        "strength": "500 mg",
        "drug_class": "penicillin",
        "indication": "Bacterial Infection",
        "allergy_contraindication_class": "penicillin",
    },
}


def hba1c_mmol_to_percent(mmol_per_mol: float) -> float:
    """Convert IFCC HbA1c (mmol/mol) to NGSP HbA1c (%) using spec formula:

    HbA1c % = 0.0915 x mmol/mol + 2.15 (63 gives ~7.9%).
    """
    return round(0.0915 * mmol_per_mol + 2.15, 2)


def hba1c_percent_to_mmol(percent: float) -> float:
    """Convert NGSP HbA1c (%) to IFCC HbA1c (mmol/mol)."""
    return round((percent - 2.15) / 0.0915, 1)
