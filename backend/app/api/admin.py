"""Admin management endpoints for data ingestion and demo resets."""

from typing import Any, Dict

from fastapi import APIRouter, Depends, status
from sqlmodel import Session, delete

from app.api.deps import require_role
from app.db.session import get_session
from app.domain.models import (
    Allergy,
    AuditEntry,
    Claim,
    Condition,
    Consent,
    Encounter,
    IdentityLink,
    IngestReject,
    MasterPatient,
    Medication,
    Observation,
    ReviewItem,
    SourceRecord,
)
from app.integration.pipeline import run_ingest
from app.seed import seed_users

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.post(
    "/ingest",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role("admin"))],
)
def trigger_ingest(session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Admin-only endpoint to trigger idempotent ingestion across all feeder systems."""
    stats = run_ingest(session)
    return {
        "status": "success",
        "message": "Ingestion completed successfully",
        "ingested": stats,
    }


@router.post(
    "/reset-demo",
    status_code=status.HTTP_200_OK,
    dependencies=[Depends(require_role("admin"))],
)
def reset_demo(session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Admin-only endpoint to reset the demo environment to fresh seed state."""
    # Wipe clinical data, consents, audit entries, and identity linkage tables
    session.exec(delete(AuditEntry))
    session.exec(delete(Consent))
    session.exec(delete(IdentityLink))
    session.exec(delete(ReviewItem))
    session.exec(delete(MasterPatient))
    session.exec(delete(Claim))
    session.exec(delete(Observation))
    session.exec(delete(Medication))
    session.exec(delete(Allergy))
    session.exec(delete(Condition))
    session.exec(delete(Encounter))
    session.exec(delete(SourceRecord))
    session.exec(delete(IngestReject))
    session.commit()

    # Re-seed users
    seed_users(session)

    # Re-run full ingestion
    stats = run_ingest(session)

    return {
        "status": "success",
        "message": "Demo reset complete. Seed data ingested into fresh database.",
        "ingested": stats,
    }
