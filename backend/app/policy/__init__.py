"""Policy engine package for CareLens role and consent-based authorization."""

from app.policy.engine import (
    ALL_CATEGORIES,
    ROLE_MATRIX,
    decide,
    make_restricted_marker,
)

__all__ = ["ALL_CATEGORIES", "ROLE_MATRIX", "decide", "make_restricted_marker"]
