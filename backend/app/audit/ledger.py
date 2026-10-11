"""Tamper-evident append-only audit ledger with cryptographic hash chaining."""

import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlmodel import Session, select

from app.domain.models import AuditEntry

GENESIS_HASH: str = "0" * 64


def canonical_json(payload: Dict[str, Any]) -> str:
    """Serialize payload to deterministic, canonical JSON."""
    return json.dumps(payload, sort_keys=True, separators=(",", ":"))


def make_payload(
    ts: datetime,
    actor: str,
    role: str,
    action: str,
    decision: str,
    reason: str = "",
    clid: Optional[str] = None,
    categories: str = "",
) -> Dict[str, Any]:
    """Create structured canonical dictionary for hashing."""
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return {
        "action": action,
        "actor": actor,
        "categories": categories,
        "clid": clid or "",
        "decision": decision,
        "reason": reason,
        "role": role,
        "ts": ts.isoformat(),
    }


def compute_entry_hash(prev_hash: str, payload: Dict[str, Any]) -> str:
    """Compute SHA-256(prev_hash + canonical JSON)."""
    raw_bytes = (prev_hash + canonical_json(payload)).encode("utf-8")
    return hashlib.sha256(raw_bytes).hexdigest()


def get_last_entry(session: Session) -> Optional[AuditEntry]:
    """Retrieve the most recent entry from the audit ledger."""
    statement = select(AuditEntry).order_by(AuditEntry.id.desc()).limit(1)
    return session.exec(statement).first()


def log(
    session: Session,
    actor: str,
    role: str,
    action: str,
    decision: str,
    reason: str = "",
    clid: Optional[str] = None,
    categories: str = "",
    ts: Optional[datetime] = None,
) -> AuditEntry:
    """Append a tamper-evident entry to the audit log.

    Every clinical decision (ALLOW or DENY) is recorded here with cryptographic hash chaining.
    """
    entry_ts = ts or datetime.now(timezone.utc)
    if entry_ts.tzinfo is None:
        entry_ts = entry_ts.replace(tzinfo=timezone.utc)

    # 1. Fetch previous entry to get prev_hash
    last_entry = get_last_entry(session)
    prev_hash = last_entry.hash if last_entry else GENESIS_HASH

    # 2. Build canonical payload and hash
    payload = make_payload(
        ts=entry_ts,
        actor=actor,
        role=role,
        action=action,
        decision=decision,
        reason=reason,
        clid=clid,
        categories=categories,
    )
    entry_hash = compute_entry_hash(prev_hash, payload)

    # 3. Create and persist new AuditEntry
    entry = AuditEntry(
        ts=entry_ts,
        actor=actor,
        role=role,
        clid=clid,
        action=action,
        categories=categories,
        decision=decision,
        reason=reason,
        prev_hash=prev_hash,
        hash=entry_hash,
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


def verify_chain(session: Session) -> Dict[str, Any]:
    """Verify the integrity of the cryptographic audit hash chain.

    Returns status indicating whether the ledger is intact or broken, with failure point.
    """
    entries: List[AuditEntry] = list(
        session.exec(select(AuditEntry).order_by(AuditEntry.id.asc())).all()
    )

    if not entries:
        return {
            "verified": True,
            "count": 0,
            "broken_at_id": None,
            "message": "Audit ledger is empty",
        }

    expected_prev_hash = GENESIS_HASH

    for entry in entries:
        # Check chain link
        if entry.prev_hash != expected_prev_hash:
            return {
                "verified": False,
                "count": len(entries),
                "broken_at_id": entry.id,
                "message": (
                    f"Chain broken at entry ID {entry.id}: prev_hash '{entry.prev_hash}' "
                    f"does not match expected '{expected_prev_hash}'"
                ),
            }

        # Check hash recalculation
        payload = make_payload(
            ts=entry.ts,
            actor=entry.actor,
            role=entry.role,
            action=entry.action,
            decision=entry.decision,
            reason=entry.reason,
            clid=entry.clid,
            categories=entry.categories,
        )
        calculated_hash = compute_entry_hash(entry.prev_hash, payload)

        if calculated_hash != entry.hash:
            return {
                "verified": False,
                "count": len(entries),
                "broken_at_id": entry.id,
                "message": (
                    f"Integrity check failed at entry ID {entry.id}: recorded hash '{entry.hash}' "
                    f"differs from calculated '{calculated_hash}'"
                ),
            }

        expected_prev_hash = entry.hash

    return {
        "verified": True,
        "count": len(entries),
        "broken_at_id": None,
        "message": f"All {len(entries)} audit entries successfully verified against genesis hash",
    }
