"""Unified patient API endpoints implementing spec §6 and §7.

Endpoints:
- GET /patients?q= (search across name, phone, source ID, and CLID with linked_systems & best_score)
- GET /patients/{clid}/unified (full unified record across all clinical categories)
- GET /patients/{clid}/timeline (chronological clinical feed with type, source, and date filters)
- GET /patients/{clid}/summary (active problems, reconciled medications with conflicts,
  allergies, lab trends, encounters, claims)
- GET /patients/{clid}/identity (linked source records with per-field evidence and provenance)

Every category read is authorized via policy.decide() with restricted markers on denial.
"""

import json
import re
from collections import defaultdict
from datetime import datetime
from typing import Any, Dict, List, Optional, Set

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from app.api.deps import get_current_user
from app.db.session import get_session
from app.domain.models import (
    Allergy,
    Claim,
    Condition,
    Encounter,
    IdentityLink,
    MasterPatient,
    Medication,
    Observation,
    SourceRecord,
    User,
)
from app.policy.engine import decide, make_restricted_marker

router = APIRouter(prefix="/patients", tags=["Patients"])


def _clean_phone(phone: Optional[str]) -> Optional[str]:
    """Extract digits for phone matching."""
    if not phone:
        return None
    digits = re.sub(r"\D", "", phone)
    return digits[-10:] if len(digits) >= 10 else digits


@router.get("", status_code=status.HTTP_200_OK)
def search_patients(
    q: Optional[str] = Query(default=None, description="Search by name, phone, source ID, or CLID"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> List[Dict[str, Any]]:
    """Search unified patients with linked systems and match confidence."""
    # Patient role can only view themselves
    if current_user.role == "patient":
        if not current_user.linked_clid:
            return []
        patient = session.exec(
            select(MasterPatient).where(MasterPatient.clid == current_user.linked_clid)
        ).first()
        if not patient:
            return []
        matching_patients = [patient]
    else:
        # Clinical & administrative search
        matching_clids: Set[str] = set()

        if q and q.strip():
            query_term = q.strip()
            clean_digits = _clean_phone(query_term)

            # 1. Direct CLID match
            clid_hits = session.exec(
                select(MasterPatient.clid).where(MasterPatient.clid.ilike(f"%{query_term}%"))
            ).all()
            matching_clids.update(clid_hits)

            # 2. Name match
            name_hits = session.exec(
                select(MasterPatient.clid).where(MasterPatient.name.ilike(f"%{query_term}%"))
            ).all()
            matching_clids.update(name_hits)

            # 3. Phone match
            phone_hits = session.exec(
                select(MasterPatient.clid).where(MasterPatient.phone.ilike(f"%{query_term}%"))
            ).all()
            matching_clids.update(phone_hits)

            if clean_digits and len(clean_digits) >= 5:
                # Also match against normalized digits across patients
                all_pts = session.exec(select(MasterPatient.clid, MasterPatient.phone)).all()
                for c_id, ph in all_pts:
                    if ph:
                        p_digits = re.sub(r"\D", "", ph)
                        if clean_digits in p_digits or p_digits in clean_digits:
                            matching_clids.add(c_id)

            # 4. SourceRecord ID match (e.g. APL-004512, LB-77120, TX-9981)
            src_hits = session.exec(
                select(SourceRecord.clid).where(
                    SourceRecord.source_record_id.ilike(f"%{query_term}%"),
                    SourceRecord.clid.isnot(None),
                )
            ).all()
            matching_clids.update(src for src in src_hits if src)

            matching_patients = list(
                session.exec(
                    select(MasterPatient).where(MasterPatient.clid.in_(matching_clids))
                ).all()
            )
        else:
            # Default recent list
            matching_patients = list(
                session.exec(select(MasterPatient).order_by(MasterPatient.id.asc()).limit(20)).all()
            )

    results: List[Dict[str, Any]] = []

    for pat in matching_patients:
        # Check authorization for demographics_min
        min_dec = decide(session, current_user, pat.clid, "demographics_min")
        if not min_dec["allow"]:
            # If actor is not authorized to even see patient demographics, skip
            continue

        full_dec = decide(session, current_user, pat.clid, "demographics_full")
        full_allowed = full_dec["allow"]

        # Fetch linked systems and highest confidence score
        links = session.exec(select(IdentityLink).where(IdentityLink.master_clid == pat.clid)).all()
        linked_systems = sorted(list({lnk.source for lnk in links}))
        best_score = max([lnk.confidence_score for lnk in links], default=1.0)

        hit = {
            "clid": pat.clid,
            "name": pat.name,
            "gender": pat.gender,
            "dob": pat.dob if full_allowed else make_restricted_marker(full_dec["reason"]),
            "phone": pat.phone if full_allowed else make_restricted_marker(full_dec["reason"]),
            "pincode": pat.pincode if full_allowed else make_restricted_marker(full_dec["reason"]),
            "city": pat.city if full_allowed else make_restricted_marker(full_dec["reason"]),
            "state": pat.state if full_allowed else make_restricted_marker(full_dec["reason"]),
            "linked_systems": linked_systems,
            "best_score": round(best_score, 4),
        }
        results.append(hit)

    return results


@router.get("/{clid}/unified", status_code=status.HTTP_200_OK)
def get_unified_patient(
    clid: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """Retrieve full unified patient view across all feeder systems with policy enforcement."""
    patient = session.exec(select(MasterPatient).where(MasterPatient.clid == clid)).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with CLID '{clid}' not found",
        )

    # 1. Demographics authorization
    min_dec = decide(session, current_user, clid, "demographics_min")
    full_dec = decide(session, current_user, clid, "demographics_full")

    if min_dec["allow"]:
        patient_obj: Any = {
            "clid": patient.clid,
            "name": patient.name,
            "gender": patient.gender,
            "dob": patient.dob if full_dec["allow"] else make_restricted_marker(full_dec["reason"]),
            "phone": (
                patient.phone if full_dec["allow"] else make_restricted_marker(full_dec["reason"])
            ),
            "pincode": (
                patient.pincode if full_dec["allow"] else make_restricted_marker(full_dec["reason"])
            ),
            "city": (
                patient.city if full_dec["allow"] else make_restricted_marker(full_dec["reason"])
            ),
            "state": (
                patient.state if full_dec["allow"] else make_restricted_marker(full_dec["reason"])
            ),
        }
    else:
        patient_obj = make_restricted_marker(min_dec["reason"])

    # 2. Clinical categories evaluation
    clinical_data: Dict[str, Any] = {}

    # Encounters
    enc_dec = decide(session, current_user, clid, "encounters")
    if enc_dec["allow"]:
        encs = session.exec(
            select(Encounter).where(Encounter.clid == clid).order_by(Encounter.recorded_at.desc())
        ).all()
        clinical_data["encounters"] = [
            {
                "id": e.encounter_id,
                "source": e.source,
                "source_record_id": e.source_record_id,
                "recorded_at": e.recorded_at.isoformat(),
                "reason": e.reason,
                "period_start": e.period_start.isoformat() if e.period_start else None,
                "period_end": e.period_end.isoformat() if e.period_end else None,
                "normalized": e.normalized,
            }
            for e in encs
        ]
    else:
        clinical_data["encounters"] = make_restricted_marker(enc_dec["reason"])

    # Conditions
    cond_dec = decide(session, current_user, clid, "conditions")
    if cond_dec["allow"]:
        conds = session.exec(
            select(Condition).where(Condition.clid == clid).order_by(Condition.recorded_at.desc())
        ).all()
        clinical_data["conditions"] = [
            {
                "id": c.condition_id,
                "source": c.source,
                "source_record_id": c.source_record_id,
                "recorded_at": c.recorded_at.isoformat(),
                "code": c.code,
                "display": c.display,
                "clinical_status": c.clinical_status,
                "normalized": c.normalized,
            }
            for c in conds
        ]
    else:
        clinical_data["conditions"] = make_restricted_marker(cond_dec["reason"])

    # Allergies
    alg_dec = decide(session, current_user, clid, "allergies")
    if alg_dec["allow"]:
        algs = session.exec(
            select(Allergy).where(Allergy.clid == clid).order_by(Allergy.recorded_at.desc())
        ).all()
        clinical_data["allergies"] = [
            {
                "id": a.allergy_id,
                "source": a.source,
                "source_record_id": a.source_record_id,
                "recorded_at": a.recorded_at.isoformat(),
                "substance": a.substance,
                "allergy_class": a.allergy_class,
                "reaction": a.reaction,
                "criticality": a.criticality,
                "clinical_status": a.clinical_status,
                "normalized": a.normalized,
            }
            for a in algs
        ]
    else:
        clinical_data["allergies"] = make_restricted_marker(alg_dec["reason"])

    # Medications
    med_dec = decide(session, current_user, clid, "medications")
    if med_dec["allow"]:
        meds = session.exec(
            select(Medication)
            .where(Medication.clid == clid)
            .order_by(Medication.recorded_at.desc())
        ).all()
        clinical_data["medications"] = [
            {
                "id": m.medication_id,
                "source": m.source,
                "source_record_id": m.source_record_id,
                "recorded_at": m.recorded_at.isoformat(),
                "brand_name": m.brand_name,
                "generic_name": m.generic_name,
                "dosage": m.dosage,
                "quantity": m.quantity,
                "drug_class": m.drug_class,
                "normalized": m.normalized,
            }
            for m in meds
        ]
    else:
        clinical_data["medications"] = make_restricted_marker(med_dec["reason"])

    # Labs / Observations
    lab_dec = decide(session, current_user, clid, "labs")
    if lab_dec["allow"]:
        obs_list = session.exec(
            select(Observation)
            .where(Observation.clid == clid)
            .order_by(Observation.recorded_at.desc())
        ).all()
        clinical_data["labs"] = [
            {
                "id": o.observation_id,
                "source": o.source,
                "source_record_id": o.source_record_id,
                "recorded_at": o.recorded_at.isoformat(),
                "panel_name": o.panel_name,
                "local_code": o.local_code,
                "test_name": o.test_name,
                "loinc_code": o.loinc_code,
                "value": o.value,
                "unit": o.unit,
                "flag": o.flag,
                "raw_value": o.raw_value,
                "raw_unit": o.raw_unit,
                "normalized": o.normalized,
            }
            for o in obs_list
        ]
    else:
        clinical_data["labs"] = make_restricted_marker(lab_dec["reason"])

    # Claims
    claim_dec = decide(session, current_user, clid, "claims")
    if claim_dec["allow"]:
        claims = session.exec(
            select(Claim).where(Claim.clid == clid).order_by(Claim.recorded_at.desc())
        ).all()
        clinical_data["claims"] = [
            {
                "id": cl.claim_id,
                "source": cl.source,
                "source_record_id": cl.source_record_id,
                "recorded_at": cl.recorded_at.isoformat(),
                "category": cl.category,
                "claimed_amount": cl.claimed_amount,
                "approved_amount": cl.approved_amount,
                "status": cl.status,
                "description": cl.description,
                "normalized": cl.normalized,
            }
            for cl in claims
        ]
    else:
        clinical_data["claims"] = make_restricted_marker(claim_dec["reason"])

    # 3. Linked feeder systems
    links = session.exec(select(IdentityLink).where(IdentityLink.master_clid == clid)).all()
    linked_systems = sorted(list({lnk.source for lnk in links}))

    return {
        "clid": clid,
        "patient": patient_obj,
        "linked_systems": linked_systems,
        **clinical_data,
    }


@router.get("/{clid}/timeline", status_code=status.HTTP_200_OK)
def get_patient_timeline(
    clid: str,
    types: Optional[str] = Query(default=None, description="Comma-separated types to include"),
    sources: Optional[str] = Query(default=None, description="Comma-separated sources to filter"),
    from_date: Optional[str] = Query(default=None, description="ISO starting date YYYY-MM-DD"),
    to_date: Optional[str] = Query(default=None, description="ISO ending date YYYY-MM-DD"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """Retrieve chronological feed of clinical events filtered by category permissions."""
    patient = session.exec(select(MasterPatient).where(MasterPatient.clid == clid)).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with CLID '{clid}' not found",
        )

    # Allowed categories by policy
    type_filters = {t.strip().lower() for t in types.split(",")} if types else None
    source_filters = {s.strip().lower() for s in sources.split(",")} if sources else None

    timeline_items: List[Dict[str, Any]] = []

    # Helper date filter
    def date_in_range(ts: datetime) -> bool:
        ts_date = ts.strftime("%Y-%m-%d")
        if from_date and ts_date < from_date:
            return False
        if to_date and ts_date > to_date:
            return False
        return True

    # 1. Encounters
    if (not type_filters or "encounter" in type_filters) and decide(
        session, current_user, clid, "encounters"
    )["allow"]:
        encs = session.exec(select(Encounter).where(Encounter.clid == clid)).all()
        for e in encs:
            if source_filters and e.source.lower() not in source_filters:
                continue
            if not date_in_range(e.recorded_at):
                continue
            timeline_items.append(
                {
                    "id": f"enc_{e.id}",
                    "item_type": "encounter",
                    "category": "encounters",
                    "source": e.source,
                    "source_record_id": e.source_record_id,
                    "recorded_at": e.recorded_at.isoformat(),
                    "title": e.reason or "Clinical Encounter",
                    "subtitle": f"Source: {e.source.upper()} ({e.source_record_id})",
                    "data": {
                        "encounter_id": e.encounter_id,
                        "period_start": e.period_start.isoformat() if e.period_start else None,
                        "period_end": e.period_end.isoformat() if e.period_end else None,
                    },
                }
            )

    # 2. Conditions
    if (not type_filters or "condition" in type_filters) and decide(
        session, current_user, clid, "conditions"
    )["allow"]:
        conds = session.exec(select(Condition).where(Condition.clid == clid)).all()
        for c in conds:
            if source_filters and c.source.lower() not in source_filters:
                continue
            if not date_in_range(c.recorded_at):
                continue
            timeline_items.append(
                {
                    "id": f"cond_{c.id}",
                    "item_type": "condition",
                    "category": "conditions",
                    "source": c.source,
                    "source_record_id": c.source_record_id,
                    "recorded_at": c.recorded_at.isoformat(),
                    "title": c.display,
                    "subtitle": f"Code: {c.code or 'N/A'} • Status: {c.clinical_status}",
                    "data": {"condition_id": c.condition_id, "code": c.code},
                }
            )

    # 3. Allergies
    if (not type_filters or "allergy" in type_filters) and decide(
        session, current_user, clid, "allergies"
    )["allow"]:
        algs = session.exec(select(Allergy).where(Allergy.clid == clid)).all()
        for a in algs:
            if source_filters and a.source.lower() not in source_filters:
                continue
            if not date_in_range(a.recorded_at):
                continue
            timeline_items.append(
                {
                    "id": f"alg_{a.id}",
                    "item_type": "allergy",
                    "category": "allergies",
                    "source": a.source,
                    "source_record_id": a.source_record_id,
                    "recorded_at": a.recorded_at.isoformat(),
                    "title": f"Allergy: {a.substance}",
                    "subtitle": f"Reaction: {a.reaction or 'None'} • Criticality: {a.criticality}",
                    "data": {"allergy_id": a.allergy_id, "class": a.allergy_class},
                }
            )

    # 4. Medications
    if (not type_filters or "medication" in type_filters) and decide(
        session, current_user, clid, "medications"
    )["allow"]:
        meds = session.exec(select(Medication).where(Medication.clid == clid)).all()
        for m in meds:
            if source_filters and m.source.lower() not in source_filters:
                continue
            if not date_in_range(m.recorded_at):
                continue
            title = f"{m.brand_name or m.generic_name}"
            if m.dosage:
                title += f" ({m.dosage})"
            timeline_items.append(
                {
                    "id": f"med_{m.id}",
                    "item_type": "medication",
                    "category": "medications",
                    "source": m.source,
                    "source_record_id": m.source_record_id,
                    "recorded_at": m.recorded_at.isoformat(),
                    "title": title,
                    "subtitle": f"Generic: {m.generic_name} • Action: {m.source.upper()}",
                    "data": {
                        "medication_id": m.medication_id,
                        "dosage": m.dosage,
                        "quantity": m.quantity,
                    },
                }
            )

    # 5. Labs / Observations
    if (not type_filters or "observation" in type_filters) and decide(
        session, current_user, clid, "labs"
    )["allow"]:
        obs_list = session.exec(select(Observation).where(Observation.clid == clid)).all()
        for o in obs_list:
            if source_filters and o.source.lower() not in source_filters:
                continue
            if not date_in_range(o.recorded_at):
                continue
            timeline_items.append(
                {
                    "id": f"obs_{o.id}",
                    "item_type": "observation",
                    "category": "labs",
                    "source": o.source,
                    "source_record_id": o.source_record_id,
                    "recorded_at": o.recorded_at.isoformat(),
                    "title": f"{o.test_name}: {o.value} {o.unit}",
                    "subtitle": f"Panel: {o.panel_name} • Flag: {o.flag or 'NORMAL'}",
                    "data": {
                        "observation_id": o.observation_id,
                        "loinc_code": o.loinc_code,
                        "value": o.value,
                        "unit": o.unit,
                        "flag": o.flag,
                    },
                }
            )

    # 6. Claims
    if (not type_filters or "claim" in type_filters) and decide(
        session, current_user, clid, "claims"
    )["allow"]:
        claims = session.exec(select(Claim).where(Claim.clid == clid)).all()
        for cl in claims:
            if source_filters and cl.source.lower() not in source_filters:
                continue
            if not date_in_range(cl.recorded_at):
                continue
            timeline_items.append(
                {
                    "id": f"clm_{cl.id}",
                    "item_type": "claim",
                    "category": "claims",
                    "source": cl.source,
                    "source_record_id": cl.source_record_id,
                    "recorded_at": cl.recorded_at.isoformat(),
                    "title": f"Claim {cl.claim_id}: ₹{cl.claimed_amount:.2f}",
                    "subtitle": f"Status: {cl.status} • Approved: ₹{cl.approved_amount:.2f}",
                    "data": {
                        "category": cl.category,
                        "description": cl.description,
                        "status": cl.status,
                    },
                }
            )

    # Sort chronological reverse (newest first)
    timeline_items.sort(key=lambda item: item["recorded_at"], reverse=True)

    return {
        "clid": clid,
        "total": len(timeline_items),
        "items": timeline_items,
    }


@router.get("/{clid}/summary", status_code=status.HTTP_200_OK)
def get_patient_summary(
    clid: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """Retrieve clinical summary with medication reconciliation, lab trends, and conflict flags."""
    patient = session.exec(select(MasterPatient).where(MasterPatient.clid == clid)).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with CLID '{clid}' not found",
        )

    summary: Dict[str, Any] = {"clid": clid}

    # 1. Active Problems / Conditions
    cond_dec = decide(session, current_user, clid, "conditions")
    if cond_dec["allow"]:
        conditions = session.exec(
            select(Condition)
            .where(Condition.clid == clid, Condition.clinical_status == "active")
            .order_by(Condition.recorded_at.desc())
        ).all()
        summary["active_conditions"] = [
            {
                "id": c.condition_id,
                "display": c.display,
                "code": c.code,
                "recorded_at": c.recorded_at.isoformat(),
                "source": c.source,
            }
            for c in conditions
        ]
    else:
        summary["active_conditions"] = make_restricted_marker(cond_dec["reason"])

    # 2. Allergies
    alg_dec = decide(session, current_user, clid, "allergies")
    active_allergies: List[Allergy] = []
    if alg_dec["allow"]:
        active_allergies = list(
            session.exec(
                select(Allergy).where(Allergy.clid == clid).order_by(Allergy.recorded_at.desc())
            ).all()
        )
        summary["allergies"] = [
            {
                "id": a.allergy_id,
                "substance": a.substance,
                "reaction": a.reaction,
                "criticality": a.criticality,
                "recorded_at": a.recorded_at.isoformat(),
                "source": a.source,
            }
            for a in active_allergies
        ]
    else:
        summary["allergies"] = make_restricted_marker(alg_dec["reason"])

    # 3. Merged Current Medications with Conflict Flagging (Spec §8 planted issues)
    med_dec = decide(session, current_user, clid, "medications")
    if med_dec["allow"]:
        meds = session.exec(
            select(Medication)
            .where(Medication.clid == clid)
            .order_by(Medication.recorded_at.desc())
        ).all()

        # Check documented penicillin allergies for conflict checking
        has_penicillin_allergy = any(
            "penicillin" in (a.substance.lower() or "")
            or (a.allergy_class or "").lower() == "penicillin"
            for a in active_allergies
        )

        # Group medications by generic name
        grouped_meds: Dict[str, List[Medication]] = defaultdict(list)
        for m in meds:
            grouped_meds[m.generic_name.lower()].append(m)

        reconciled_medications: List[Dict[str, Any]] = []

        for gen_name, med_group in grouped_meds.items():
            sources = sorted(list({m.source for m in med_group}))
            has_ehr = "ehr" in sources
            has_pharmacy = "pharmacy" in sources

            # Latest medication entry
            latest_m = med_group[0]

            has_conflict = False
            conflict_type: Optional[str] = None
            conflict_detail: Optional[str] = None

            # Discrepancy 1: Dispensed by pharmacy but missing from EHR prescription
            if has_pharmacy and not has_ehr:
                has_conflict = True
                conflict_type = "missing_from_ehr"
                conflict_detail = (
                    f"{latest_m.brand_name or gen_name} dispensed by pharmacy "
                    f"but missing from hospital EHR prescription records."
                )

            # Discrepancy 2: Allergy conflict (e.g. Mox 500 / amoxicillin with Penicillin allergy)
            is_penicillin_related = (
                "amoxicillin" in gen_name
                or "penicillin" in gen_name
                or (latest_m.drug_class or "").lower() == "penicillin"
            )
            if has_penicillin_allergy and is_penicillin_related:
                has_conflict = True
                conflict_type = "allergy_conflict"
                conflict_detail = (
                    f"CRITICAL ALLERGY CONFLICT: {latest_m.brand_name or gen_name} "
                    f"dispensed to patient with documented Penicillin allergy."
                )

            reconciled_medications.append(
                {
                    "generic_name": latest_m.generic_name,
                    "brand_name": latest_m.brand_name,
                    "dosage": latest_m.dosage,
                    "sources": sources,
                    "ehr_prescribed": has_ehr,
                    "pharmacy_dispensed": has_pharmacy,
                    "has_conflict": has_conflict,
                    "conflict_type": conflict_type,
                    "conflict_detail": conflict_detail,
                    "recorded_at": latest_m.recorded_at.isoformat(),
                }
            )

        summary["current_medications"] = reconciled_medications
    else:
        summary["current_medications"] = make_restricted_marker(med_dec["reason"])

    # 4. Lab Trends: Latest value per lab test with 6-point trend series
    lab_dec = decide(session, current_user, clid, "labs")
    if lab_dec["allow"]:
        obs_all = session.exec(
            select(Observation)
            .where(Observation.clid == clid)
            .order_by(Observation.recorded_at.asc())
        ).all()

        # Group observations by standardized LOINC or test name
        grouped_obs: Dict[str, List[Observation]] = defaultdict(list)
        for o in obs_all:
            key = o.loinc_code or o.test_name
            grouped_obs[key].append(o)

        lab_panels: List[Dict[str, Any]] = []
        for key, obs_list in grouped_obs.items():
            latest_obs = obs_list[-1]

            # Construct trend of up to 6 points
            trend_points = [
                {
                    "recorded_at": o.recorded_at.isoformat(),
                    "value": o.value,
                    "unit": o.unit,
                    "flag": o.flag,
                    "source": o.source,
                }
                for o in obs_list[-6:]
            ]

            lab_panels.append(
                {
                    "test_name": latest_obs.test_name,
                    "loinc_code": latest_obs.loinc_code,
                    "current_value": latest_obs.value,
                    "unit": latest_obs.unit,
                    "flag": latest_obs.flag or "NORMAL",
                    "recorded_at": latest_obs.recorded_at.isoformat(),
                    "source": latest_obs.source,
                    "trend": trend_points,
                }
            )

        summary["lab_trends"] = lab_panels
    else:
        summary["lab_trends"] = make_restricted_marker(lab_dec["reason"])

    # 5. Recent Encounters
    enc_dec = decide(session, current_user, clid, "encounters")
    if enc_dec["allow"]:
        recent_encs = session.exec(
            select(Encounter)
            .where(Encounter.clid == clid)
            .order_by(Encounter.recorded_at.desc())
            .limit(5)
        ).all()
        summary["recent_encounters"] = [
            {
                "id": e.encounter_id,
                "reason": e.reason,
                "recorded_at": e.recorded_at.isoformat(),
                "source": e.source,
            }
            for e in recent_encs
        ]
    else:
        summary["recent_encounters"] = make_restricted_marker(enc_dec["reason"])

    # 6. Claim Status
    claim_dec = decide(session, current_user, clid, "claims")
    if claim_dec["allow"]:
        claims = session.exec(
            select(Claim).where(Claim.clid == clid).order_by(Claim.recorded_at.desc())
        ).all()
        summary["claims"] = [
            {
                "id": cl.claim_id,
                "claimed_amount": cl.claimed_amount,
                "approved_amount": cl.approved_amount,
                "status": cl.status,
                "category": cl.category,
                "description": cl.description,
                "recorded_at": cl.recorded_at.isoformat(),
                "source": cl.source,
            }
            for cl in claims
        ]
    else:
        summary["claims"] = make_restricted_marker(claim_dec["reason"])

    return summary


@router.get("/{clid}/identity", status_code=status.HTTP_200_OK)
def get_patient_identity(
    clid: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """Retrieve identity resolution provenance, linked records, and per-field match evidence."""
    patient = session.exec(select(MasterPatient).where(MasterPatient.clid == clid)).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with CLID '{clid}' not found",
        )

    # Demographics access check
    min_dec = decide(session, current_user, clid, "demographics_min")
    if not min_dec["allow"]:
        return make_restricted_marker(min_dec["reason"])

    # Retrieve all identity links
    links = session.exec(select(IdentityLink).where(IdentityLink.master_clid == clid)).all()

    formatted_links: List[Dict[str, Any]] = []
    for lnk in links:
        try:
            ev = json.loads(lnk.evidence_json)
        except Exception:
            ev = {}

        formatted_links.append(
            {
                "source": lnk.source,
                "source_record_id": lnk.source_record_id,
                "confidence_score": round(lnk.confidence_score, 4),
                "evidence": ev,
                "status": lnk.status,
                "created_at": lnk.created_at.isoformat(),
            }
        )

    try:
        provenance = json.loads(patient.provenance_json)
    except Exception:
        provenance = {}

    try:
        alternates = json.loads(patient.alternates_json)
    except Exception:
        alternates = {}

    return {
        "clid": clid,
        "canonical_name": patient.name,
        "provenance": provenance,
        "alternates": alternates,
        "links": formatted_links,
    }
