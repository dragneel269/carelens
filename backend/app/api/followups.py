"""Refill gap and adherence alerts API — P17.

GET /followups
  Returns a list of patients with overdue pharmacy refills based on
  days_supply vs last dispense date. Accessible to pharmacist and doctor.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from app.api.deps import get_current_user
from app.audit.ledger import log as audit_log
from app.db.session import get_session
from app.domain.models import MasterPatient, Medication, User

router = APIRouter(prefix="/followups", tags=["Follow-ups"])

ALLOWED_ROLES = {"pharmacist", "doctor", "nurse"}


@router.get("", status_code=status.HTTP_200_OK)
def list_overdue_refills(
    min_days_overdue: int = Query(default=0, ge=0, description="Minimum days overdue filter"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> List[Dict[str, Any]]:
    """List patients with overdue medication refills.

    Computes expected_refill_date = last_dispensed + days_supply.
    Returns patients where today > expected_refill_date.

    Access: pharmacist, doctor, nurse only.
    """
    if current_user.role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{current_user.role}' is not authorized for refill alerts",
        )

    audit_log(
        session=session,
        actor=current_user.username,
        role=current_user.role,
        action="read",
        decision="ALLOW",
        reason="Refill gap alerts list accessed",
        categories="medications",
    )

    now = datetime.now(timezone.utc)

    # All pharmacy medications with a days_supply value
    meds: List[Medication] = list(
        session.exec(
            select(Medication).where(
                Medication.source == "pharmacy",
                Medication.days_supply != None,  # noqa: E711
            )
        ).all()
    )

    # Group by clid — keep only the most recent dispense per generic per patient
    # Key: (clid, generic_name) -> most recent medication record
    best: Dict[tuple, Medication] = {}
    for m in meds:
        if not m.clid:
            continue
        key = (m.clid, (m.generic_name or "").lower())
        existing = best.get(key)
        if existing is None or (
            m.recorded_at and (existing.recorded_at is None or m.recorded_at > existing.recorded_at)
        ):
            best[key] = m

    overdue: List[Dict[str, Any]] = []
    for (clid, generic), med in best.items():
        if not med.recorded_at or not med.days_supply:
            continue

        dispensed_at = med.recorded_at
        if dispensed_at.tzinfo is None:
            dispensed_at = dispensed_at.replace(tzinfo=timezone.utc)

        from datetime import timedelta

        expected_refill = dispensed_at + timedelta(days=med.days_supply)
        if now <= expected_refill:
            continue  # Not overdue

        days_overdue = (now - expected_refill).days
        if days_overdue < min_days_overdue:
            continue

        # Look up patient name
        patient = session.exec(select(MasterPatient).where(MasterPatient.clid == clid)).first()
        patient_name = patient.name if patient else "Unknown"

        overdue.append(
            {
                "clid": clid,
                "patient_name": patient_name,
                "generic_name": med.generic_name,
                "brand_name": med.brand_name,
                "dosage": med.dosage,
                "days_supply": med.days_supply,
                "last_dispensed": dispensed_at.isoformat(),
                "expected_refill_date": expected_refill.isoformat(),
                "days_overdue": days_overdue,
                "pharmacy": med.source_record_id,
            }
        )

    # Sort by most overdue first
    overdue.sort(key=lambda x: x["days_overdue"], reverse=True)
    return overdue
