"""Pharmacy Counter View API — simulated OTP consent and safety check per P15.

Endpoints:
- POST /counter/otp/request   -> generate simulated OTP (returned in response, no real SMS)
- POST /counter/otp/confirm   -> validate OTP, create 24h counter consent, audit log
- GET  /counter/{clid}/safety -> policy-gated allergy + drug safety flags for pharmacist
"""

import random
import re
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from app.api.deps import get_current_user
from app.audit.ledger import log as audit_log
from app.db.session import get_session
from app.domain.models import (
    Allergy,
    Consent,
    MasterPatient,
    Medication,
    User,
)

router = APIRouter(prefix="/counter", tags=["Counter"])

_OTP_STORE: Dict[str, tuple] = {}
OTP_TTL_SECONDS = 300
COUNTER_CONSENT_HOURS = 24


class OTPRequestPayload(BaseModel):
    phone: str
    clid: Optional[str] = None


class OTPConfirmPayload(BaseModel):
    clid: str
    otp_code: str


def _clean_phone(phone: str) -> str:
    digits = re.sub(r"\D", "", phone)
    return digits[-10:] if len(digits) >= 10 else digits


def _resolve_clid_by_phone(session: Session, phone: str) -> Optional[str]:
    needle = _clean_phone(phone)
    patients = session.exec(select(MasterPatient)).all()
    for p in patients:
        if p.phone and _clean_phone(p.phone) == needle:
            return p.clid
    return None


def _active_counter_consent_exists(session: Session, clid: str) -> bool:
    now = datetime.now(timezone.utc)
    existing = session.exec(
        select(Consent).where(
            Consent.clid == clid,
            Consent.group == "counter",
            Consent.status == "active",
            Consent.valid_to > now,
        )
    ).first()
    return existing is not None


@router.post("/otp/request", status_code=status.HTTP_200_OK)
def request_otp(
    payload: OTPRequestPayload,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    if current_user.role != "pharmacist":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only pharmacists may request counter OTPs",
        )
    phone_key = _clean_phone(payload.phone)
    if not phone_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Valid phone number required"
        )
    clid = payload.clid or _resolve_clid_by_phone(session, payload.phone)
    otp_code = f"{random.randint(100000, 999999)}"
    _OTP_STORE[phone_key] = (otp_code, time.time() + OTP_TTL_SECONDS)
    audit_log(
        session=session,
        actor=current_user.username,
        role=current_user.role,
        action="counter_otp_request",
        decision="ALLOW",
        reason=f"Simulated OTP generated for phone ...{phone_key[-4:]}",
        clid=clid,
        categories="counter_consent",
    )
    return {
        "message": "OTP generated (simulated — no SMS sent)",
        "simulated": True,
        "otp_code": otp_code,
        "expires_in_seconds": OTP_TTL_SECONDS,
        "clid": clid,
    }


@router.post("/otp/confirm", status_code=status.HTTP_200_OK)
def confirm_otp(
    payload: OTPConfirmPayload,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    if current_user.role != "pharmacist":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only pharmacists may confirm counter OTPs",
        )
    patient = session.exec(select(MasterPatient).where(MasterPatient.clid == payload.clid)).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Patient {payload.clid} not found"
        )
    phone_key = _clean_phone(patient.phone or "")
    stored = _OTP_STORE.get(phone_key)
    if not stored:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active OTP found. Request a new OTP.",
        )
    otp_code, expires_at = stored
    if time.time() > expires_at:
        _OTP_STORE.pop(phone_key, None)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="OTP expired. Request a new OTP."
        )
    if payload.otp_code != otp_code:
        audit_log(
            session=session,
            actor=current_user.username,
            role=current_user.role,
            action="counter_otp_confirm",
            decision="DENY",
            reason="Invalid OTP",
            clid=payload.clid,
            categories="counter_consent",
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP code")
    _OTP_STORE.pop(phone_key, None)
    now = datetime.now(timezone.utc)
    valid_until = now + timedelta(hours=COUNTER_CONSENT_HOURS)
    old_consents = session.exec(
        select(Consent).where(
            Consent.clid == payload.clid, Consent.group == "counter", Consent.status == "active"
        )
    ).all()
    for old in old_consents:
        old.status = "revoked"
        session.add(old)
    consent = Consent(
        clid=payload.clid,
        group="counter",
        categories="demographics_min,allergies,medications",
        purpose="counter_check",
        valid_to=valid_until,
        status="active",
        created_at=now,
    )
    session.add(consent)
    session.commit()
    audit_log(
        session=session,
        actor=current_user.username,
        role=current_user.role,
        action="counter_consent_create",
        decision="ALLOW",
        reason="24h counter consent created via OTP confirmation",
        clid=payload.clid,
        categories="demographics_min,allergies,medications",
    )
    return {
        "message": "Counter consent granted",
        "clid": payload.clid,
        "consent_group": "counter",
        "valid_until": valid_until.isoformat(),
        "purpose": "counter_check",
    }


@router.get("/{clid}/safety", status_code=status.HTTP_200_OK)
def get_safety_check(
    clid: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    if current_user.role != "pharmacist":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Counter safety checks are only for pharmacists",
        )
    if not _active_counter_consent_exists(session, clid):
        audit_log(
            session=session,
            actor=current_user.username,
            role=current_user.role,
            action="counter_safety_check",
            decision="DENY",
            reason="No active counter consent — OTP required",
            clid=clid,
            categories="allergies,medications",
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No active counter consent. Complete OTP verification first.",
        )
    patient = session.exec(select(MasterPatient).where(MasterPatient.clid == clid)).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Patient {clid} not found"
        )
    audit_log(
        session=session,
        actor=current_user.username,
        role=current_user.role,
        action="counter_safety_check",
        decision="ALLOW",
        reason="Access allowed via active counter consent",
        clid=clid,
        categories="allergies,medications",
    )
    allergies: List[Allergy] = list(
        session.exec(
            select(Allergy).where(Allergy.clid == clid, Allergy.clinical_status == "active")
        ).all()
    )
    allergy_classes = {(a.allergy_class or "").lower() for a in allergies if a.allergy_class}
    all_meds: List[Medication] = list(
        session.exec(select(Medication).where(Medication.clid == clid)).all()
    )
    pharmacy_meds = [m for m in all_meds if m.source == "pharmacy"]
    ehr_meds = [m for m in all_meds if m.source != "pharmacy"]
    ehr_generics = {m.generic_name.lower() for m in ehr_meds if m.generic_name}
    flags: List[Dict[str, Any]] = []
    for med in pharmacy_meds:
        drug_class = (med.drug_class or "").lower()
        generic = (med.generic_name or "").lower()
        brand = med.brand_name or med.generic_name or "unknown"
        dispensed_at = med.recorded_at.isoformat() if med.recorded_at else None
        if drug_class and drug_class in allergy_classes:
            matching = next(
                (a for a in allergies if (a.allergy_class or "").lower() == drug_class), None
            )
            flags.append(
                {
                    "flag": "allergy_conflict",
                    "severity": "critical",
                    "medication": brand,
                    "generic_name": med.generic_name,
                    "drug_class": med.drug_class,
                    "allergy_substance": matching.substance if matching else "Unknown",
                    "allergy_class": drug_class,
                    "source": med.source,
                    "dispensed_at": dispensed_at,
                    "message": (
                        f"{brand} ({med.generic_name}, class: {med.drug_class}) conflicts with "
                        f"documented allergy to {matching.substance if matching else drug_class}"
                    ),
                }
            )
        if generic in ehr_generics:
            ehr_match = next((m for m in ehr_meds if m.generic_name.lower() == generic), None)
            flags.append(
                {
                    "flag": "duplicate_therapy",
                    "severity": "warning",
                    "medication": brand,
                    "generic_name": med.generic_name,
                    "also_prescribed_in": ehr_match.source if ehr_match else "clinic",
                    "source": med.source,
                    "dispensed_at": dispensed_at,
                    "message": (
                        f"{med.generic_name} is prescribed by clinic AND dispensed at pharmacy."
                    ),
                }
            )
        elif generic and generic not in ehr_generics:
            flags.append(
                {
                    "flag": "missing_from_ehr",
                    "severity": "info",
                    "medication": brand,
                    "generic_name": med.generic_name,
                    "source": med.source,
                    "dispensed_at": dispensed_at,
                    "message": (
                        f"{brand} ({med.generic_name}) dispensed at pharmacy without prescription."
                    ),
                }
            )
        if (
            med.brand_name
            and med.generic_name
            and med.brand_name.lower() != med.generic_name.lower()
        ):
            flags.append(
                {
                    "flag": "brand_to_generic",
                    "severity": "info",
                    "medication": brand,
                    "generic_name": med.generic_name,
                    "suggestion": (
                        f"Consider dispensing {med.generic_name} instead of {med.brand_name}"
                    ),
                    "source": med.source,
                    "dispensed_at": dispensed_at,
                    "message": f"{med.brand_name} is a brand name for {med.generic_name}.",
                }
            )
    return {
        "clid": clid,
        "patient_name": patient.name,
        "consent_verified": True,
        "allergies_checked": len(allergies),
        "medications_checked": len(pharmacy_meds),
        "flags": flags,
        "flag_count": len(flags),
        "critical_count": sum(1 for f in flags if f["severity"] == "critical"),
    }
