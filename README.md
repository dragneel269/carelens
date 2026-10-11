# CareLens

A unified patient view across EHR, diagnostic lab, pharmacy, and insurer systems for India. Matches records of the same patient without relying on national IDs, applies patient consent and role-based access redaction, and maintains a tamper-evident audit ledger.

## Architecture

- **`web/`**: Vite, React, TypeScript (strict), Tailwind CSS v4, shadcn/ui primitives, TanStack Query, React Router, Lucide icons, Fontsource typography (`Newsreader`, `Instrument Sans`, `IBM Plex Mono`).
- **`backend/`**: Python 3.12 managed via `uv`, FastAPI, SQLModel, SQLite, PyJWT, Argon2, RapidFuzz, Jellyfish, Faker, pytest, httpx, ruff.

## Quickstart

### Prerequisites
- Node.js (>= 20)
- `uv` (>= 0.10) with Python 3.12

### Install & Run
```bash
# Install root & frontend dependencies
npm install
npm --prefix web install

# Start both services (backend on :8000, frontend on :5173 with /api proxy)
npm run dev

# Run synthetic data seeder
npm run seed

# Run full test suite (backend pytest + web vitest)
npm run test

# Run code linters (backend ruff + web eslint)
npm run lint

# Build frontend production bundle
npm run build
```

## Health Endpoints
- Direct backend: `http://127.0.0.1:8000/health`
- Frontend proxied: `http://127.0.0.1:5173/api/health`
