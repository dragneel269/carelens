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
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
