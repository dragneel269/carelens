# CareLens agent rules (solo build, Solution B, Tier 1)

## What this is
A hackathon medtech app for India: a unified patient view across EHR, lab, pharmacy
and insurer systems. It matches records of the same person without relying on any
national ID, applies patient consent and role-based redaction, and keeps a tamper-evident
audit ledger. Synthetic data only. Spec: docs/spec.md. Design: docs/design-system.md.

## Always do this first
1. Read docs/LOOP.md (the work protocol) and docs/PROGRESS.md (what is done, what is next).
2. Read only the spec sections the prompt names.

## Approved stack (ask before adding anything else; nothing paid, nothing needing a card)
- web/: Vite, React, TypeScript (strict), Tailwind CSS v4, shadcn/ui (with Radix, vaul),
  motion, recharts, @tanstack/react-query, @tanstack/react-table, zustand, react-router,
  cmdk, sonner, lucide-react, date-fns, Fontsource (Instrument Sans, Newsreader, IBM Plex Mono),
  vitest, playwright.
- backend/: Python 3.12 managed by uv, FastAPI, SQLModel, SQLite, PyJWT, argon2-cffi,
  rapidfuzz, jellyfish, Faker, pytest, httpx, ruff.
- root: npm scripts using concurrently (Windows, macOS and Linux must all work).

## Commands (run from the repo root)
npm run dev | npm run seed | npm run test | npm run lint | npm run build

## Architecture rules
- backend/app/{api,core,db,domain,integration,policy,audit,seed}. Routers stay thin.
- Every clinical read: policy.decide() then audit.log(). Default deny.
- Policy decisions are never cached; a revoked consent applies to the next request.
- web/src/{pages,features,components,lib,api}. Server state via TanStack Query.
  No business rules in the UI: render the `restricted` markers the API returns.

## Data and safety
- Synthetic data only. Phone numbers use the fake pattern 90000 xxxxx. Never real IDs.
- Never request, store or log Aadhaar numbers. ABHA is not used in this build.
- No secrets in git. Use .env and .env.example.

## Design rules (non-negotiable; this must NOT look like an AI template)
- Use only the tokens in docs/design-system.md.
- Forbidden: purple or blue gradients, glassmorphism, glowing blobs, emoji as icons,
  centered hero sections, the default shadcn zinc theme, lorem ipsum, stock illustrations.
- Dense but calm: 4px grid, hairline borders, small radii, mono tabular numbers for values.
- Every screen has a loading skeleton, an empty state and an error state.
- Motion 150 to 220 ms, disabled under prefers-reduced-motion.
- Accessible: keyboard navigable, visible focus rings, AA contrast, aria labels.

## Quality
- TypeScript strict. Python type hints. ruff and eslint clean.
- Tests are required for policy, matching, audit chain and normalization.
- Small commits named `area: change`. Never commit failing tests.

## Working style
- Do not edit files you were not asked to touch.
- Do not add dependencies outside the approved list.
- Finish every task by updating docs/PROGRESS.md.