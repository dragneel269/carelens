"""Normalization routines for clinical codes, units, brands, and dates per spec §9."""

from datetime import datetime, timezone
from typing import Any, Optional, Tuple

from app.domain.mappings import (
    BRAND_MAPPINGS,
    LOCAL_CODE_TO_LOINC,
    LOINC_CODES,
    hba1c_mmol_to_percent,
)


def parse_iso_datetime(date_str: Any) -> datetime:
    """Parse various date strings (ISO 8601, DD/MM/YYYY, etc.) into UTC datetime."""
    if isinstance(date_str, datetime):
        if date_str.tzinfo is None:
            return date_str.replace(tzinfo=timezone.utc)
        return date_str.astimezone(timezone.utc)

    if not date_str or not isinstance(date_str, str):
        return datetime.now(timezone.utc)

    cleaned = date_str.strip()

    # Try ISO formats
    for iso_fmt in (
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
    ):
        try:
            dt = datetime.strptime(cleaned, iso_fmt)
            if dt.tzinfo is None:
                return dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc)
        except ValueError:
            continue

    # Try DD/MM/YYYY (e.g. "14/03/1968")
    for dmy_fmt in ("%d/%m/%Y", "%d/%m/%Y %H:%M:%S"):
        try:
            dt = datetime.strptime(cleaned, dmy_fmt)
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue

    # Fallback to current UTC time if unparseable
    return datetime.now(timezone.utc)


def parse_date_of_birth(dob_str: Optional[str]) -> Optional[str]:
    """Normalize birth date string into standard ISO YYYY-MM-DD format."""
    if not dob_str:
        return None
    cleaned = str(dob_str).strip()
    try:
        dt = parse_iso_datetime(cleaned)
        return dt.strftime("%Y-%m-%d")
    except Exception:
        return cleaned


def normalize_lab_observation(
    local_code: str,
    test_name: str,
    raw_value: float,
    raw_unit: str,
) -> Tuple[Optional[str], float, str, bool]:
    """Normalize local lab code and numeric value to LOINC code and standard unit.

    Returns:
        (loinc_code, normalized_value, standard_unit, is_normalized)
    """
    clean_code = (local_code or "").strip().upper()
    clean_unit = (raw_unit or "").strip()

    loinc_code = LOCAL_CODE_TO_LOINC.get(clean_code)

    # Check for HbA1c aliases or test_name hints
    if not loinc_code:
        lower_name = (test_name or "").lower()
        if "glycated" in lower_name or "hba1c" in lower_name or "glyco hb" in lower_name:
            loinc_code = "4548-4"
        elif "fasting" in lower_name and ("glucose" in lower_name or "sugar" in lower_name):
            loinc_code = "1558-6"
        elif "cholesterol total" in lower_name or "total cholesterol" in lower_name:
            loinc_code = "2093-3"
        elif "hdl" in lower_name:
            loinc_code = "2085-9"
        elif "ldl" in lower_name:
            loinc_code = "13457-7"
        elif "triglyceride" in lower_name:
            loinc_code = "2571-8"

    # If code remains unmapped, keep raw value and mark normalized=False
    if not loinc_code or loinc_code not in LOINC_CODES:
        return (None, raw_value, clean_unit, False)

    target_unit = LOINC_CODES[loinc_code]["standard_unit"]

    # Special handling for HbA1c (LOINC 4548-4) unit conversion
    if loinc_code == "4548-4":
        if "mmol" in clean_unit.lower() or raw_value > 25.0:
            # Value is in IFCC mmol/mol -> convert to NGSP %: 0.0915 * val + 2.15
            norm_val = hba1c_mmol_to_percent(raw_value)
            return (loinc_code, norm_val, "%", True)
        return (loinc_code, round(raw_value, 2), "%", True)

    # For glucose and lipids, standard unit is mg/dL
    return (loinc_code, round(raw_value, 2), target_unit, True)


def normalize_medication(
    brand_or_generic: str,
) -> Tuple[Optional[str], str, Optional[str], Optional[str], bool]:
    """Map commercial brand medication to generic name, dosage, and drug class.

    Returns:
        (brand_name, generic_name, dosage, drug_class, is_normalized)
    """
    clean_name = (brand_or_generic or "").strip()

    # Exact brand lookup
    for brand, info in BRAND_MAPPINGS.items():
        if brand.lower() == clean_name.lower() or clean_name.lower().startswith(brand.lower()):
            return (
                brand,
                info["generic"],
                info.get("strength"),
                info.get("drug_class"),
                True,
            )

    # Check generic names
    for brand, info in BRAND_MAPPINGS.items():
        generic = info["generic"]
        if generic.lower() in clean_name.lower():
            return (
                None,
                generic,
                info.get("strength"),
                info.get("drug_class"),
                True,
            )

    # If unmapped, retain raw name with normalized=False
    return (None, clean_name, None, None, False)
