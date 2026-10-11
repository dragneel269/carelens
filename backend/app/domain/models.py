"""Core domain data models."""

from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from sqlmodel import Field, SQLModel


class UserRole(str, Enum):
    """Supported actor roles per spec section 3 and section 7."""

    DOCTOR = "doctor"
    NURSE = "nurse"
    PHARMACIST = "pharmacist"
    LAB_TECH = "lab_tech"
    BILLING = "billing"
    ADMIN = "admin"
    PATIENT = "patient"


class User(SQLModel, table=True):
    """User account model for authentication and role-based policy enforcement."""

    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True, nullable=False)
    hashed_password: str = Field(nullable=False)
    role: str = Field(index=True, nullable=False)
    full_name: str = Field(default="", nullable=False)
    linked_clid: Optional[str] = Field(default=None, index=True)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class SourceRecord(SQLModel, table=True):
    """Raw ingestion source record representing a patient profile in a specific feeder system."""

    __tablename__ = "source_records"

    id: Optional[int] = Field(default=None, primary_key=True)
    source: str = Field(index=True, nullable=False)  # "ehr", "lab", "pharmacy", "claims"
    source_record_id: str = Field(index=True, nullable=False)
    patient_name: str = Field(nullable=False)
    dob: Optional[str] = Field(default=None)
    gender: Optional[str] = Field(default=None)
    phone: Optional[str] = Field(default=None)
    pincode: Optional[str] = Field(default=None)
    city: Optional[str] = Field(default=None)
    state: Optional[str] = Field(default=None)
    clid: Optional[str] = Field(default=None, index=True)  # Linked MasterPatient ID
    raw_json: str = Field(default="{}", nullable=False)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class Encounter(SQLModel, table=True):
    """Clinical encounter record."""

    __tablename__ = "encounters"

    id: Optional[int] = Field(default=None, primary_key=True)
    clid: Optional[str] = Field(default=None, index=True)
    source: str = Field(index=True, nullable=False)
    source_record_id: str = Field(index=True, nullable=False)
    encounter_id: str = Field(index=True, nullable=False)
    recorded_at: datetime = Field(index=True, nullable=False)
    reason: str = Field(default="", nullable=False)
    period_start: Optional[datetime] = Field(default=None)
    period_end: Optional[datetime] = Field(default=None)
    normalized: bool = Field(default=True, nullable=False)
    raw_data: str = Field(default="{}", nullable=False)


class Condition(SQLModel, table=True):
    """Clinical condition or diagnosis."""

    __tablename__ = "conditions"

    id: Optional[int] = Field(default=None, primary_key=True)
    clid: Optional[str] = Field(default=None, index=True)
    source: str = Field(index=True, nullable=False)
    source_record_id: str = Field(index=True, nullable=False)
    condition_id: str = Field(index=True, nullable=False)
    recorded_at: datetime = Field(index=True, nullable=False)
    code: Optional[str] = Field(default=None)
    display: str = Field(nullable=False)
    clinical_status: str = Field(default="active", nullable=False)
    normalized: bool = Field(default=True, nullable=False)
    raw_data: str = Field(default="{}", nullable=False)


class Allergy(SQLModel, table=True):
    """Allergy intolerance record."""

    __tablename__ = "allergies"

    id: Optional[int] = Field(default=None, primary_key=True)
    clid: Optional[str] = Field(default=None, index=True)
    source: str = Field(index=True, nullable=False)
    source_record_id: str = Field(index=True, nullable=False)
    allergy_id: str = Field(index=True, nullable=False)
    recorded_at: datetime = Field(index=True, nullable=False)
    substance: str = Field(nullable=False)
    allergy_class: Optional[str] = Field(default=None)
    reaction: str = Field(default="", nullable=False)
    criticality: str = Field(default="high", nullable=False)
    clinical_status: str = Field(default="active", nullable=False)
    normalized: bool = Field(default=True, nullable=False)
    raw_data: str = Field(default="{}", nullable=False)


class Medication(SQLModel, table=True):
    """Medication prescription or pharmacy dispensation."""

    __tablename__ = "medications"

    id: Optional[int] = Field(default=None, primary_key=True)
    clid: Optional[str] = Field(default=None, index=True)
    source: str = Field(index=True, nullable=False)
    source_record_id: str = Field(index=True, nullable=False)
    medication_id: str = Field(index=True, nullable=False)
    recorded_at: datetime = Field(index=True, nullable=False)
    brand_name: Optional[str] = Field(default=None)
    generic_name: str = Field(nullable=False)
    dosage: Optional[str] = Field(default=None)
    quantity: Optional[int] = Field(default=None)
    drug_class: Optional[str] = Field(default=None)
    normalized: bool = Field(default=True, nullable=False)
    raw_data: str = Field(default="{}", nullable=False)


class Observation(SQLModel, table=True):
    """Laboratory test result observation."""

    __tablename__ = "observations"

    id: Optional[int] = Field(default=None, primary_key=True)
    clid: Optional[str] = Field(default=None, index=True)
    source: str = Field(index=True, nullable=False)
    source_record_id: str = Field(index=True, nullable=False)
    observation_id: str = Field(index=True, nullable=False)
    recorded_at: datetime = Field(index=True, nullable=False)
    panel_name: str = Field(default="", nullable=False)
    local_code: str = Field(nullable=False)
    test_name: str = Field(default="", nullable=False)
    loinc_code: Optional[str] = Field(default=None, index=True)
    raw_value: float = Field(nullable=False)
    raw_unit: str = Field(nullable=False)
    value: float = Field(nullable=False)
    unit: str = Field(nullable=False)
    flag: Optional[str] = Field(default=None)
    normalized: bool = Field(default=True, nullable=False)
    raw_data: str = Field(default="{}", nullable=False)


class Claim(SQLModel, table=True):
    """Insurance claim adjudication item."""

    __tablename__ = "claims"

    id: Optional[int] = Field(default=None, primary_key=True)
    clid: Optional[str] = Field(default=None, index=True)
    source: str = Field(index=True, nullable=False)
    source_record_id: str = Field(index=True, nullable=False)
    claim_id: str = Field(index=True, nullable=False)
    recorded_at: datetime = Field(index=True, nullable=False)
    category: str = Field(default="", nullable=False)
    claimed_amount: float = Field(nullable=False)
    approved_amount: float = Field(default=0.0, nullable=False)
    status: str = Field(default="PENDING", nullable=False)
    description: str = Field(default="", nullable=False)
    normalized: bool = Field(default=True, nullable=False)
    raw_data: str = Field(default="{}", nullable=False)


class IngestReject(SQLModel, table=True):
    """Dead letter queue / rejects table for malformed records."""

    __tablename__ = "ingest_rejects"

    id: Optional[int] = Field(default=None, primary_key=True)
    source: str = Field(index=True, nullable=False)
    source_record_id: Optional[str] = Field(default=None)
    error_message: str = Field(nullable=False)
    raw_payload: str = Field(default="{}", nullable=False)
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class MasterPatient(SQLModel, table=True):
    """Golden master patient record with synthesized canonical demographics."""

    __tablename__ = "master_patients"

    id: Optional[int] = Field(default=None, primary_key=True)
    clid: str = Field(unique=True, index=True, nullable=False)  # "CL-000001" style
    name: str = Field(nullable=False)
    dob: Optional[str] = Field(default=None)
    gender: Optional[str] = Field(default=None)
    phone: Optional[str] = Field(default=None, index=True)
    pincode: Optional[str] = Field(default=None)
    city: Optional[str] = Field(default=None)
    state: Optional[str] = Field(default=None)
    provenance_json: str = Field(default="{}", nullable=False)
    alternates_json: str = Field(default="{}", nullable=False)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class IdentityLink(SQLModel, table=True):
    """Record linkage relationship between a source record and a master patient."""

    __tablename__ = "identity_links"

    id: Optional[int] = Field(default=None, primary_key=True)
    master_clid: str = Field(index=True, nullable=False)
    source: str = Field(index=True, nullable=False)
    source_record_id: str = Field(index=True, nullable=False)
    confidence_score: float = Field(nullable=False)
    evidence_json: str = Field(default="{}", nullable=False)
    status: str = Field(default="auto_linked", nullable=False)  # "auto_linked", "manual_approved"
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class ReviewItem(SQLModel, table=True):
    """Candidate link pair requiring manual steward review (score 0.70 - 0.89)."""

    __tablename__ = "review_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    source_a: str = Field(nullable=False)
    record_id_a: str = Field(nullable=False)
    source_b: str = Field(nullable=False)
    record_id_b: str = Field(nullable=False)
    score: float = Field(nullable=False)
    evidence_json: str = Field(default="{}", nullable=False)
    status: str = Field(default="pending", nullable=False)  # "pending", "approved", "rejected"
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class Consent(SQLModel, table=True):
    """Patient consent grant allowing specific role group access to categories."""

    __tablename__ = "consents"

    id: Optional[int] = Field(default=None, primary_key=True)
    clid: str = Field(index=True, nullable=False)
    group: str = Field(index=True, nullable=False)  # "clinicians", "pharmacy", "lab", "billing"
    categories: str = Field(nullable=False)  # Comma-separated categories
    purpose: str = Field(default="treatment", nullable=False)  # "treatment", "payment"
    valid_to: datetime = Field(nullable=False)
    status: str = Field(default="active", index=True, nullable=False)  # active, revoked, expired
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class AuditEntry(SQLModel, table=True):
    """Append-only cryptographic hash-chained audit log entry."""

    __tablename__ = "audit_entries"

    id: Optional[int] = Field(default=None, primary_key=True)
    ts: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        index=True,
        nullable=False,
    )
    actor: str = Field(index=True, nullable=False)
    role: str = Field(index=True, nullable=False)
    clid: Optional[str] = Field(default=None, index=True)
    action: str = Field(nullable=False)  # "read", "verify", "revoke", "consent_create", etc.
    categories: str = Field(default="", nullable=False)
    decision: str = Field(nullable=False)  # "ALLOW", "DENY"
    reason: str = Field(default="", nullable=False)
    prev_hash: str = Field(nullable=False)
    hash: str = Field(nullable=False)


