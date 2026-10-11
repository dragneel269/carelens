"""Consent service API endpoints for patient-controlled access grants and revocations."""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.api.deps import get_current_user
from app.audit.ledger import log as audit_log
from app.db.session import get_session
from app.domain.models import Consent, User

router = APIRouter(prefix="/consents", tags=["Consents"])


class ConsentCreateRequest(BaseModel):
    """Payload schema for granting new patient consent."""

    clid: str
    group: str  # "clinicians", "pharmacy", "lab", "billing"
    categories: str  # Comma-separated list of categories
    purpose: str = "treatment"
    valid_days: int = Field(default=30, ge=1, le=365)


@router.get("", status_code=status.HTTP_200_OK)
def list_consents(
    clid: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> List[Consent]:
    """List consent records filtered by patient CLID and status.

    Authorization:
    - Patient: can view consents for their own linked CLID only.
    - Clinical/admin roles: can view consents for the specified CLID.
    """
    target_clid = clid

    if current_user.role == "patient":
        if not current_user.linked_clid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Patient account has no linked patient record",
            )
        if target_clid and target_clid != current_user.linked_clid:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Patients may only view their own consents",
            )
        target_clid = current_user.linked_clid

    statement = select(Consent)
    if target_clid:
        statement = statement.where(Consent.clid == target_clid)
    if status_filter:
        statement = statement.where(Consent.status == status_filter)

    statement = statement.order_by(Consent.created_at.desc())
    return list(session.exec(statement).all())


@router.post("", status_code=status.HTTP_201_CREATED)
def create_consent(
    payload: ConsentCreateRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> Consent:
    """Grant or update a patient consent policy.

    Authorization:
    - Patient can grant consent for their own linked CLID.
    - Admin can manage consents for any patient.
    """
    if current_user.role == "patient":
        if payload.clid != current_user.linked_clid:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Patients may only manage their own consents",
            )
    elif current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only patients and administrators may grant consents",
        )

    now = datetime.now(timezone.utc)
    valid_until = now + timedelta(days=payload.valid_days)

    consent = Consent(
        clid=payload.clid,
        group=payload.group,
        categories=payload.categories,
        purpose=payload.purpose,
        valid_to=valid_until,
        status="active",
        created_at=now,
    )
    session.add(consent)
    session.commit()
    session.refresh(consent)
    consent_dict = consent.model_dump()

    # Log to audit ledger
    audit_log(
        session=session,
        actor=current_user.username,
        role=current_user.role,
        action="consent_create",
        decision="ALLOW",
        reason=(
            f"Granted consent for group '{payload.group}' and categories "
            f"'{payload.categories}' valid {payload.valid_days} days"
        ),
        clid=payload.clid,
        categories=payload.categories,
    )

    return consent_dict


@router.post("/{consent_id}/revoke", status_code=status.HTTP_200_OK)
def revoke_consent(
    consent_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """Revoke an active consent immediately.

    Per spec §7, policy decisions are uncached; revoked consent denies on the very next read.
    """
    consent = session.get(Consent, consent_id)
    if not consent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Consent with ID {consent_id} not found",
        )

    # Authorization check
    if current_user.role == "patient":
        if consent.clid != current_user.linked_clid:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: Patients may only revoke their own consents",
            )
    elif current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only patients and administrators may revoke consents",
        )

    consent.status = "revoked"
    session.add(consent)
    session.commit()
    session.refresh(consent)
    consent_dict = consent.model_dump()

    # Log to audit ledger
    audit_log(
        session=session,
        actor=current_user.username,
        role=current_user.role,
        action="revoke",
        decision="ALLOW",
        reason=(
            f"Consent ID {consent_id} for group '{consent.group}' "
            f"revoked by {current_user.username}"
        ),
        clid=consent.clid,
        categories=consent.categories,
    )

    return {
        "status": "success",
        "message": f"Consent {consent_id} successfully revoked",
        "consent": consent_dict,
    }
