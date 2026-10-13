"""CareLens FastAPI application entry point."""

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, AsyncGenerator, Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from app.api.admin import router as admin_router
from app.api.audit import router as audit_router
from app.api.auth import router as auth_router
from app.api.consents import router as consents_router
from app.api.counter import router as counter_router
from app.api.followups import router as followups_router
from app.api.patients import router as patients_router
from app.db.session import create_db_and_tables, engine
from app.domain.models import SourceRecord, User
from app.integration.pipeline import run_ingest
from app.seed import seed_users


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Execute startup and shutdown tasks, auto-seeding if database is fresh."""
    # Ensure database tables exist
    create_db_and_tables()

    # Auto-run seed and ingestion if DB is empty
    with Session(engine) as session:
        has_users = session.exec(select(User)).first() is not None
        if not has_users:
            seed_users(session)

        has_source_records = session.exec(select(SourceRecord)).first() is not None
        if not has_source_records:
            run_ingest(session)

    yield


app = FastAPI(
    title="CareLens API",
    description="Unified clinical view across EHR, lab, pharmacy, and insurer systems.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routes
for r in [
    auth_router,
    admin_router,
    audit_router,
    consents_router,
    patients_router,
    counter_router,
    followups_router,
]:
    app.include_router(r)
    app.include_router(r, prefix="/api")


@app.get("/health")
@app.get("/api/health")
def health_check() -> Dict[str, Any]:
    """Return health status of the backend service."""
    return {
        "status": "ok",
        "service": "carelens-backend",
        "version": "0.1.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "environment": "development",
    }


# Also expose under /api/health for direct routing or proxied path consistency
@app.get("/api/health")
def api_health_check() -> Dict[str, Any]:
    """Alias for health check under /api prefix."""
    return health_check()
