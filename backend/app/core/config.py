"""Application settings and configuration."""

import os
from pathlib import Path

# Load settings from environment or fallback defaults
BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY: str = os.getenv(
    "SECRET_KEY",
    "carelens-synthetic-medtech-secret-key-32chars-minimum-hash-key-2026",
)
ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_HOURS: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_HOURS", "8"))
DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'carelens.db'}")
ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
