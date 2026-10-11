"""Database engine and session management using SQLModel."""

from typing import Generator

from sqlalchemy import text
from sqlmodel import Session, SQLModel, create_engine

from app.core import config

# Import all domain models so SQLModel metadata registers all tables
from app.domain.models import (  # noqa: F401
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
    User,
)

# SQLite configuration
engine = create_engine(
    config.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in config.DATABASE_URL else {},
    echo=False,
)


def create_db_and_tables() -> None:
    """Initialize database tables registered in SQLModel metadata."""
    SQLModel.metadata.create_all(engine)
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN linked_clid VARCHAR"))
            conn.commit()
        except Exception:
            pass


# Ensure schema is initialized on engine load
create_db_and_tables()


def get_session() -> Generator[Session, None, None]:
    """Dependency to provide a thread-safe database session."""
    with Session(engine) as session:
        yield session
