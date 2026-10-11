# PROGRESS
Hackathon: Tue 13 Oct 2026. Build days: Sun 11 and Mon 12 Oct.

- [x] P1  Scaffold
- [ ] P2  Design system
- [ ] P3  Backend base + seed data
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
- Root: Cross-platform npm scripts utilizing concurrently to orchestrate backend and frontend dev, seed, test, lint, and build.

## Known issues
None.

## Next
P2