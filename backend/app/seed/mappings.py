"""Section 9 normalization and mappings file."""

import json
from pathlib import Path
from typing import Any, Dict

from app.domain.mappings import (
    BRAND_MAPPINGS,
    LOCAL_CODE_TO_LOINC,
    LOINC_CODES,
    hba1c_mmol_to_percent,
)

DATA_DIR = Path(__file__).resolve().parent / "data"


def save_mappings_json() -> Path:
    """Save Section 9 normalization specifications as JSON in seed data directory."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    mappings_file = DATA_DIR / "mappings.json"

    content: Dict[str, Any] = {
        "loinc_codes": LOINC_CODES,
        "local_code_to_loinc": LOCAL_CODE_TO_LOINC,
        "brands": BRAND_MAPPINGS,
        "formulas": {
            "hba1c_percent_from_mmol": "HbA1c % = 0.0915 * mmol/mol + 2.15",
            "example_63_mmol": {
                "input_mmol": 63,
                "output_percent": hba1c_mmol_to_percent(63),
            },
        },
    }

    with open(mappings_file, "w", encoding="utf-8") as f:
        json.dump(content, f, indent=2)

    return mappings_file
