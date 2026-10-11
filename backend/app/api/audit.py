"""Audit ledger endpoints for viewing log history and verifying cryptographic chain integrity."""

from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from app.api.deps import get_current_user, require_role
from app.audit.ledger import verify_chain
from app.db.session import get_session
from app.domain.models import AuditEntry, User

router = APIRouter(prefix="/audit", tags=["Audit"])


@router.get("", status_code=status.HTTP_200_OK)
def get_audit_log(
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> List[AuditEntry]:
    """Retrieve audit ledger records.

    Authorization:
    - Admin: can view all audit records.
    - Patient: can view only records related to their own data or actor events.
    - Other roles: 403 Forbidden.
    """
    if current_user.role == "admin":
        statement = select(AuditEntry).order_by(AuditEntry.id.desc()).offset(offset).limit(limit)
        return list(session.exec(statement).all())

    elif current_user.role == "patient":
        # Patient can view events concerning their own CLID or their own username
        linked_clid = current_user.linked_clid
        statement = (
            select(AuditEntry)
            .where((AuditEntry.clid == linked_clid) | (AuditEntry.actor == current_user.username))
            .order_by(AuditEntry.id.desc())
            .offset(offset)
            .limit(limit)
        )
        return list(session.exec(statement).all())

    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Only admin and patient roles are authorized to view audit logs",
        )


@router.get(
    "/verify",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role(["admin", "doctor"]))],
)
def verify_audit_ledger(
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """Verify cryptographic hash chain integrity across all entries in the ledger."""
    return verify_chain(session)
