"""Audit package for hash-chained tamper-evident logging."""

from app.audit.ledger import GENESIS_HASH, compute_entry_hash, log, verify_chain

__all__ = ["GENESIS_HASH", "compute_entry_hash", "log", "verify_chain"]
