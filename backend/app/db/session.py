"""Database engine and session management using SQLModel."""

from typing import Generator

from sqlmodel import Session, SQLModel, create_engine

from app.core import config

# Import all domain models so SQLModel metadata registers all tables
from app.domain.models import (  # noqa: F401
    Allergy,
    Claim,
    Condition,
    Encounter,
    IngestReject,
    Medication,
    Observation,
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


def get_session() -> Generator[Session, None, None]:
    """Dependency to provide a thread-safe database session."""
    with Session(engine) as session:
        yield session
