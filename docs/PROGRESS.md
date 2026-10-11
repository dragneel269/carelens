# PROGRESS
Hackathon: Tue 13 Oct 2026. Build days: Sun 11 and Mon 12 Oct.

- [x] P1  Scaffold
- [x] P2  Design system
- [x] P3  Backend base + seed data
- [x] P4  Adapters, normalization, ingestion
- [x] P5  Identity engine
- [x] P6  Policy, consent, audit
- [ ] P7  Unified API
- [ ] P8  App shell + search
- [ ] P9  Patient workspace
- [ ] P10 Patient portal + audit table
- [ ] P11 Polish + demo reset

## Decisions
- Backend: uv-managed Python 3.12 non-package app layout with FastAPI, SQLModel, Uvicorn, and app/{api,core,db,domain,integration,policy,audit,seed} structure.
- Web: Vite + React 19 + TypeScript strict + Tailwind CSS v4, Fontsource fonts (Newsreader, Instrument Sans, IBM Plex Mono), shadcn/ui foundation, and TanStack Query.
- Design System (P2): Strict "Clinical Editorial" paper chart aesthetics. Self-hosted fonts; tokens mapped into Tailwind v4 `@theme`; rethemed Button, Card, Badge, Input, Tabs, Sheet (380px drawer), Tooltip, Table, Popover; built signature clinical components (`Redacted`, `MatchBadge`, `SourceBadge`, `ProvChip`, `HashChip`, `EmptyState`, `SkeletonCard`); `/design` specimen verified in Light and Dark themes.
- Backend Base & Seed Data (P3): SQLModel User table, SQLite session, Argon2 password hashing, PyJWT authentication (8-hour expiry with sub and role), POST /auth/login and GET /me, require_role RBAC dependency. Seeded all 7 users from spec §3 (password `carelens-demo`). Created 4 source datasets in native formats (EHR FHIR-like JSON, Lab JSON with local codes and mixed units, Pharmacy CSV-style rows with brand names, Insurer claims JSON) with hero patient planted discrepancies, 9 Faker patients, and 2 ambiguous pairs at seed 42. Added Section 9 LOINC and brand mappings.
- Adapters, Normalization & Ingestion (P4): Built pure source adapters (`adapt_ehr_bundle`, `adapt_lab_report`, `adapt_pharmacy_dispense`, `adapt_insurer_claim`) producing canonical `SourceRecord`, `Encounter`, `Condition`, `Allergy`, `Medication`, `Observation`, and `Claim` models. Normalized local lab codes to LOINC, unified HbA1c from both labs into % series, converted brands to generics, parsed ISO dates, retaining unmapped codes with `normalized=False`. Created idempotent `run_ingest` with `IngestReject` dead-letter queue, auto-running on startup for empty databases. Added `POST /admin/ingest` and `POST /admin/reset-demo` endpoints for admin role.
- Identity Engine & Matching (P5): Built Section 4 identity matching pipeline with name normalization (honorific stripping, vowel deduplication, symmetrical token ordering), blocking (phone match or same DOB year + Jellyfish Metaphone phonetic key), and weighted scoring (Name 0.35 via RapidFuzz, DOB 0.25, Phone 0.20, Gender 0.10, Pincode 0.10). Strict thresholds: >= 0.90 auto-link, 0.70-0.89 ReviewItem only, < 0.70 ignore. Same-system IDs always link. Single-key phone constraint enforced. Golden record synthesis (`MasterPatient` with CL-000001 IDs, Hero first) using source priority (EHR > Lab > Pharmacy > Claims) then recency, preserving per-field provenance and alternates. Per-field evidence attached to each `IdentityLink`. Clid propagated to all clinical child records. Linked `ramesh` user account by phone.
- Policy, Consent & Audit (P6): Built Section 7 zero-trust policy engine in `app/policy/engine.py` with `ROLE_MATRIX`, uncached database consent evaluation, purposeful authorization (billing = payment, others = treatment), default-deny enforcement, and clinical field redaction markers. Implemented append-only cryptographic audit ledger in `app/audit/ledger.py` with `hash = SHA-256(prev_hash + canonical_json)` and full chain integrity verification (`verify_chain`). Seeded 30-day baseline patient consents for clinicians, pharmacy, lab, and billing during ingestion. Mounted `GET /audit` (admin all, patient own), `GET /audit/verify`, `GET/POST /consents`, and `POST /consents/{id}/revoke`.
- Root: Cross-platform npm scripts utilizing concurrently to orchestrate backend and frontend dev, seed, test, lint, and build.

## Known issues
None.

## Next
P7