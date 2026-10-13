"""Pure source adapters converting raw feeder payloads into canonical domain entities."""

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Tuple

from app.domain.models import (
    Allergy,
    Claim,
    Condition,
    Encounter,
    Medication,
    Observation,
    SourceRecord,
)
from app.integration.normalization import (
    normalize_lab_observation,
    normalize_medication,
    parse_date_of_birth,
    parse_iso_datetime,
)


def adapt_ehr_bundle(
    bundle_data: Dict[str, Any],
) -> Tuple[SourceRecord, List[Encounter], List[Condition], List[Allergy], List[Medication]]:
    """Pure adapter for EHR FHIR-like bundle payload."""
    entries = bundle_data.get("entry", [])

    # 1. Extract Patient resource
    patient_res = next(
        (e["resource"] for e in entries if e.get("resource", {}).get("resourceType") == "Patient"),
        {},
    )
    source_record_id = patient_res.get("id") or "UNKNOWN_EHR"

    name_obj = patient_res.get("name", [{}])[0]
    patient_name = name_obj.get("text") or " ".join(
        name_obj.get("given", []) + [name_obj.get("family", "")]
    )
    dob_raw = patient_res.get("birthDate")
    dob = parse_date_of_birth(dob_raw)
    gender = patient_res.get("gender")

    telecoms = patient_res.get("telecom", [])
    phone = next((t.get("value") for t in telecoms if t.get("system") == "phone"), None)

    addresses = patient_res.get("address", [])
    addr = addresses[0] if addresses else {}
    pincode = addr.get("postalCode")
    city = addr.get("city")
    state = addr.get("state")

    source_record = SourceRecord(
        source="ehr",
        source_record_id=source_record_id,
        patient_name=patient_name.strip(),
        dob=dob,
        gender=gender,
        phone=phone,
        pincode=pincode,
        city=city,
        state=state,
        raw_json=json.dumps(bundle_data),
    )

    encounters: List[Encounter] = []
    conditions: List[Condition] = []
    allergies: List[Allergy] = []
    medications: List[Medication] = []

    for item in entries:
        res = item.get("resource", {})
        res_type = res.get("resourceType")
        res_id = res.get("id", "UNKNOWN")

        if res_type == "Encounter":
            reason_list = res.get("reasonCode", [])
            reason_text = reason_list[0].get("text", "") if reason_list else "Clinical Encounter"
            period = res.get("period", {})
            start_dt = parse_iso_datetime(period.get("start")) if period.get("start") else None
            end_dt = parse_iso_datetime(period.get("end")) if period.get("end") else None
            recorded_at = start_dt or datetime.now(timezone.utc)

            encounters.append(
                Encounter(
                    source="ehr",
                    source_record_id=source_record_id,
                    encounter_id=res_id,
                    recorded_at=recorded_at,
                    reason=reason_text,
                    period_start=start_dt,
                    period_end=end_dt,
                    normalized=True,
                    raw_data=json.dumps(res),
                )
            )

        elif res_type == "Condition":
            code_obj = res.get("code", {})
            display = code_obj.get("text", "Condition")
            codings = code_obj.get("coding", [])
            code_val = codings[0].get("code") if codings else None
            recorded_at = parse_iso_datetime(res.get("recordedDate"))

            conditions.append(
                Condition(
                    source="ehr",
                    source_record_id=source_record_id,
                    condition_id=res_id,
                    recorded_at=recorded_at,
                    code=code_val,
                    display=display,
                    clinical_status=res.get("clinicalStatus", "active"),
                    normalized=True,
                    raw_data=json.dumps(res),
                )
            )

        elif res_type == "AllergyIntolerance":
            substance_obj = res.get("substance", {})
            substance = substance_obj.get("text", "Allergy")
            allergy_class = substance_obj.get("class")
            reactions = res.get("reaction", [])
            reaction_text = ""
            if reactions and "manifestation" in reactions[0]:
                manifs = reactions[0]["manifestation"]
                reaction_text = manifs[0].get("text", "") if manifs else ""
            recorded_at = parse_iso_datetime(res.get("recordedDate"))

            allergies.append(
                Allergy(
                    source="ehr",
                    source_record_id=source_record_id,
                    allergy_id=res_id,
                    recorded_at=recorded_at,
                    substance=substance,
                    allergy_class=allergy_class,
                    reaction=reaction_text,
                    criticality=res.get("criticality", "high"),
                    clinical_status=res.get("clinicalStatus", "active"),
                    normalized=True,
                    raw_data=json.dumps(res),
                )
            )

        elif res_type == "MedicationRequest":
            med_obj = res.get("medicationCodeableConcept", {})
            text_name = med_obj.get("text", "")
            brand, generic, dosage, drug_class, is_norm = normalize_medication(text_name)
            recorded_at = parse_iso_datetime(res.get("authoredOn"))

            medications.append(
                Medication(
                    source="ehr",
                    source_record_id=source_record_id,
                    medication_id=res_id,
                    recorded_at=recorded_at,
                    brand_name=brand,
                    generic_name=generic,
                    dosage=dosage,
                    drug_class=drug_class,
                    normalized=is_norm,
                    raw_data=json.dumps(res),
                )
            )

    return source_record, encounters, conditions, allergies, medications


def adapt_lab_report(
    report_data: Dict[str, Any],
) -> Tuple[SourceRecord, List[Observation]]:
    """Pure adapter for Diagnostic Lab JSON payload with local codes and mixed units."""
    source_record_id = report_data.get("source_patient_id") or report_data.get(
        "report_id", "UNKNOWN_LAB"
    )
    demo = report_data.get("patient_demographics", {})

    patient_name = demo.get("name", "Unknown Patient")
    dob = parse_date_of_birth(demo.get("dob"))
    gender = demo.get("gender")
    phone = demo.get("phone")
    pincode = demo.get("pincode")

    source_record = SourceRecord(
        source="lab",
        source_record_id=source_record_id,
        patient_name=patient_name.strip(),
        dob=dob,
        gender=gender,
        phone=phone,
        pincode=pincode,
        raw_json=json.dumps(report_data),
    )

    observations: List[Observation] = []
    panels = report_data.get("panels", [])

    for p_idx, panel in enumerate(panels, start=1):
        panel_name = panel.get("panel_name", "Laboratory Panel")
        collected_at = parse_iso_datetime(panel.get("collected_at"))
        results = panel.get("results", [])

        for r_idx, res in enumerate(results, start=1):
            local_code = res.get("local_code", "UNKNOWN")
            test_name = res.get("test_name", local_code)
            raw_val = float(res.get("value", 0.0))
            raw_unit = res.get("unit", "")
            flag = res.get("flag")

            loinc_code, norm_val, norm_unit, is_norm = normalize_lab_observation(
                local_code=local_code,
                test_name=test_name,
                raw_value=raw_val,
                raw_unit=raw_unit,
            )

            obs_id = f"{source_record_id}-OBS-{p_idx}-{r_idx}"

            observations.append(
                Observation(
                    source="lab",
                    source_record_id=source_record_id,
                    observation_id=obs_id,
                    recorded_at=collected_at,
                    panel_name=panel_name,
                    local_code=local_code,
                    test_name=test_name,
                    loinc_code=loinc_code,
                    raw_value=raw_val,
                    raw_unit=raw_unit,
                    value=norm_val,
                    unit=norm_unit,
                    flag=flag,
                    normalized=is_norm,
                    raw_data=json.dumps(res),
                )
            )

    return source_record, observations


def adapt_pharmacy_dispense(
    dispense_data: Dict[str, Any],
) -> Tuple[SourceRecord, Medication]:
    """Pure adapter for Retail Pharmacy dispensation record."""
    source_record_id = dispense_data.get("patient_id", "UNKNOWN_PHARM")
    patient_name = dispense_data.get("patient_name", "Unknown Patient")
    dob = parse_date_of_birth(dispense_data.get("dob"))
    phone = dispense_data.get("phone")
    pincode = dispense_data.get("pincode")

    source_record = SourceRecord(
        source="pharmacy",
        source_record_id=source_record_id,
        patient_name=patient_name.strip(),
        dob=dob,
        phone=phone,
        pincode=pincode,
        raw_json=json.dumps(dispense_data),
    )

    brand_raw = dispense_data.get("brand_name", "")
    brand, generic, std_dosage, drug_class, is_norm = normalize_medication(brand_raw)
    recorded_at = parse_iso_datetime(dispense_data.get("dispensed_date"))
    disp_id = dispense_data.get("dispense_id", f"{source_record_id}-DISP")
    dosage = dispense_data.get("dosage") or std_dosage
    qty = int(dispense_data.get("quantity", 1))
    days_supply_raw = dispense_data.get("days_supply")
    days_supply = int(days_supply_raw) if days_supply_raw is not None else None

    medication = Medication(
        source="pharmacy",
        source_record_id=source_record_id,
        medication_id=disp_id,
        recorded_at=recorded_at,
        brand_name=brand_raw,
        generic_name=generic,
        dosage=dosage,
        quantity=qty,
        drug_class=drug_class,
        days_supply=days_supply,
        normalized=is_norm,
        raw_data=json.dumps(dispense_data),
    )

    return source_record, medication


def adapt_insurer_claim(
    insurer_bundle: Dict[str, Any],
) -> Tuple[SourceRecord, List[Claim]]:
    """Pure adapter for Health Insurer claims policyholder payload."""
    source_record_id = insurer_bundle.get("policyholder_id", "UNKNOWN_CLAIMS")
    patient_name = insurer_bundle.get("patient_name", "Unknown Patient")
    dob = parse_date_of_birth(insurer_bundle.get("dob"))
    gender = insurer_bundle.get("gender")
    phone = insurer_bundle.get("phone")
    pincode = insurer_bundle.get("pincode")

    source_record = SourceRecord(
        source="claims",
        source_record_id=source_record_id,
        patient_name=patient_name.strip(),
        dob=dob,
        gender=gender,
        phone=phone,
        pincode=pincode,
        raw_json=json.dumps(insurer_bundle),
    )

    claims: List[Claim] = []
    raw_claims = insurer_bundle.get("claims", [])

    for c in raw_claims:
        claim_id = c.get("claim_id", f"{source_record_id}-CLM")
        recorded_at = parse_iso_datetime(c.get("service_date"))
        category = c.get("category", "GENERAL")
        claimed_amt = float(c.get("claimed_amount", 0.0))
        approved_amt = float(c.get("approved_amount", 0.0))
        status = c.get("status", "PENDING")
        desc = c.get("description", "")

        claims.append(
            Claim(
                source="claims",
                source_record_id=source_record_id,
                claim_id=claim_id,
                recorded_at=recorded_at,
                category=category,
                claimed_amount=claimed_amt,
                approved_amount=approved_amt,
                status=status,
                description=desc,
                normalized=True,
                raw_data=json.dumps(c),
            )
        )

    return source_record, claims
