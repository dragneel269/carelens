"""Zero-trust policy engine enforcing role-based matrix and patient consent per spec §7."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set

from sqlmodel import Session, select

from app.audit.ledger import log as audit_log
from app.domain.models import Consent, User

# All supported clinical and demographic categories
ALL_CATEGORIES: Set[str] = {
    "demographics_min",
    "demographics_full",
    "encounters",
    "conditions",
    "allergies",
    "medications",
    "labs",
    "claims",
}

# Role permission matrix per Section 7
ROLE_MATRIX: Dict[str, Set[str]] = {
    "doctor": {
        "demographics_min",
        "demographics_full",
        "encounters",
        "conditions",
        "allergies",
        "medications",
        "labs",
        "claims",
    },
    "nurse": {
        "demographics_min",
        "demographics_full",
        "encounters",
        "conditions",
        "allergies",
        "medications",
        "labs",
    },
    "pharmacist": {
        "demographics_min",
        "allergies",
        "medications",
    },
    "lab_tech": {
        "demographics_min",
        "labs",
    },
    "billing": {
        "demographics_min",
        "claims",
    },
    "admin": set(),  # Admin can only view audit logs; no clinical data access
    "patient": set(),  # Handled via own-data rule
}

# Role to consent group mapping
ROLE_GROUP_MAP: Dict[str, str] = {
    "doctor": "clinicians",
    "nurse": "clinicians",
    "pharmacist": "pharmacy",
    "lab_tech": "lab",
    "billing": "billing",
}

# Full demographics fields to redact if only demographics_min is permitted
DEMOGRAPHICS_FULL_FIELDS: List[str] = [
    "dob",
    "phone",
    "pincode",
    "city",
    "state",
]


def make_restricted_marker(reason: str = "Restricted by consent policy") -> Dict[str, Any]:
    """Create a standardized restricted field marker per spec §6."""
    return {"restricted": True, "reason": reason}


def decide(
    session: Session,
    user: User,
    clid: str,
    category: str,
    purpose: Optional[str] = None,
) -> Dict[str, Any]:
    """Evaluate access authorization for a user request against clinical data.

    Follows the strict zero-trust rules from Section 7:
    1. Default deny.
    2. Patient can access own data without consent; cannot access another patient's data.
    3. Admin has audit access only; zero clinical access.
    4. Matrix must allow the category.
    5. Purpose must match role expectation (billing = payment; others = treatment).
    6. Patient must have an active, unexpired consent for that role group, category, and purpose.
    7. Decisions are NEVER cached.
    8. Every decision (ALLOW or DENY) logs an entry to the append-only audit ledger.

    Returns:
        dict: {"allow": bool, "reason": str, "redact_fields": List[str]}
    """
    actor = user.username
    role = user.role
    expected_purpose = "payment" if role == "billing" else "treatment"
    effective_purpose = purpose or expected_purpose

    # 1. Patient own data rule
    if role == "patient":
        if user.linked_clid == clid:
            reason = "Access granted: Patient authorized to view own clinical records"
            audit_log(
                session=session,
                actor=actor,
                role=role,
                action="read",
                decision="ALLOW",
                reason=reason,
                clid=clid,
                categories=category,
            )
            return {"allow": True, "reason": reason, "redact_fields": []}
        else:
            reason = f"Denied: Patient '{actor}' cannot access data for patient '{clid}'"
            audit_log(
                session=session,
                actor=actor,
                role=role,
                action="read",
                decision="DENY",
                reason=reason,
                clid=clid,
                categories=category,
            )
            return {"allow": False, "reason": reason, "redact_fields": []}

    # 2. Admin audit-only rule
    if role == "admin":
        reason = "Denied: Admin role is restricted to audit access only"
        audit_log(
            session=session,
            actor=actor,
            role=role,
            action="read",
            decision="DENY",
            reason=reason,
            clid=clid,
            categories=category,
        )
        return {"allow": False, "reason": reason, "redact_fields": []}

    # 3. Role-based matrix rule
    allowed_categories = ROLE_MATRIX.get(role, set())
    if category not in allowed_categories:
        reason = f"Denied: Role '{role}' is not authorized for category '{category}'"
        audit_log(
            session=session,
            actor=actor,
            role=role,
            action="read",
            decision="DENY",
            reason=reason,
            clid=clid,
            categories=category,
        )
        return {"allow": False, "reason": reason, "redact_fields": []}

    # 4. Purpose compatibility check
    if effective_purpose != expected_purpose:
        reason = (
            f"Denied: Role '{role}' requires purpose '{expected_purpose}', "
            f"requested '{effective_purpose}'"
        )
        audit_log(
            session=session,
            actor=actor,
            role=role,
            action="read",
            decision="DENY",
            reason=reason,
            clid=clid,
            categories=category,
        )
        return {"allow": False, "reason": reason, "redact_fields": []}

    # 5. Patient consent verification (uncached, query database directly)
    role_group = ROLE_GROUP_MAP.get(role)
    if not role_group:
        reason = f"Denied: No consent group defined for role '{role}'"
        audit_log(
            session=session,
            actor=actor,
            role=role,
            action="read",
            decision="DENY",
            reason=reason,
            clid=clid,
            categories=category,
        )
        return {"allow": False, "reason": reason, "redact_fields": []}

    now_utc = datetime.now(timezone.utc)
    statement = select(Consent).where(
        Consent.clid == clid,
        Consent.group == role_group,
        Consent.status == "active",
        Consent.valid_to > now_utc,
    )
    active_consents = session.exec(statement).all()

    # Search for matching consent grant
    consent_matched = False
    for c in active_consents:
        granted_categories = {cat.strip() for cat in c.categories.split(",") if cat.strip()}
        if category in granted_categories and c.purpose == expected_purpose:
            consent_matched = True
            break

    if consent_matched:
        reason = (
            f"Access granted: Allowed by role matrix and active patient consent "
            f"for group '{role_group}'"
        )
        redact_fields: List[str] = []
        # If user only has demographics_min and not demographics_full,
        # flag full fields for redaction
        if category == "demographics_min" and "demographics_full" not in allowed_categories:
            redact_fields = list(DEMOGRAPHICS_FULL_FIELDS)

        audit_log(
            session=session,
            actor=actor,
            role=role,
            action="read",
            decision="ALLOW",
            reason=reason,
            clid=clid,
            categories=category,
        )
        return {"allow": True, "reason": reason, "redact_fields": redact_fields}

    # Denied due to lack of active unexpired consent
    reason = (
        f"Denied: No active unexpired consent for group '{role_group}' and category '{category}'"
    )
    audit_log(
        session=session,
        actor=actor,
        role=role,
        action="read",
        decision="DENY",
        reason=reason,
        clid=clid,
        categories=category,
    )
    return {"allow": False, "reason": reason, "redact_fields": []}
