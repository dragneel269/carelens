"""CareLens FastAPI application entry point."""

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, AsyncGenerator, Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.db.session import create_db_and_tables


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Execute startup and shutdown tasks."""
    # Ensure database tables exist
    create_db_and_tables()
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

# Mount authentication routes
app.include_router(auth_router)


@app.get("/health")
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
