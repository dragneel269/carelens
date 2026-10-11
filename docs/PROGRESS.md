# PROGRESS
Hackathon: Tue 13 Oct 2026. Build days: Sun 11 and Mon 12 Oct.

- [x] P1  Scaffold
- [x] P2  Design system
- [x] P3  Backend base + seed data
- [ ] P4  Adapters, normalization, ingestion
- [ ] P5  Identity engine
- [ ] P6  Policy, consent, audit
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
- Root: Cross-platform npm scripts utilizing concurrently to orchestrate backend and frontend dev, seed, test, lint, and build.

## Known issues
None.

## Next
P4