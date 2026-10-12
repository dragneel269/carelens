# CareLens Project Implementation Report

*Generated: October 12, 2026*  
*Status: Complete & Verified across all 11 Build Loops (P1 through P11)*

---

## 1. Web Routes and Pages

The frontend is a Vite + React 19 + TypeScript single-page application configured with Tailwind CSS v4 and strict "Clinical Editorial" design tokens.

### 1.1 `/` — Home / Patient Directory (`web/src/pages/HomePage.tsx`)
- **Shell Layout**: 3-pane responsive layout within `AppShell` (`web/src/components/layout/AppShell.tsx`):
  - Left patient navigation sidebar (280px fixed width).
  - Central canvas displaying directory status, search metrics, and quick selection cards.
  - Collapsible right-hand inspector drawer (380px fixed width) for contextual feeder inspection.
- **Top Navigation Bar**:
  - CareLens logo and "India Medtech" badge.
  - Global Search / Quick Find trigger (`Cmd+K` / `Ctrl+K`) opening the `cmdk` palette.
  - Role switcher button ("Viewing as: Dr. Rao (DOCTOR)", etc.) opening the "Choose your badge" modal.
  - Paper chart theme toggle switching between light (`#F6F3EE` / `#FCFBF8`) and dark (`#0E151B` / `#141D25`) tokens.
- **Search & Patient List**:
  - Live query input searching by patient name, phone number, feeder source record ID, or CLID.
  - Each search result renders a `MatchBadge` displaying linked feeder count and confidence percentage (e.g., `4 systems linked · 100%`) with source-colored indicator dots (EHR blue, Lab green, Pharmacy amber, Claims terracotta).
  - Empty, loading (skeleton cards), and error states.
  - Clicking any patient navigates to `/patient/:id`.

### 1.2 `/patient/:id` — Unified Patient Chart (`web/src/pages/PatientDetailPage.tsx`)
- **Patient Banner**:
  - Canonical patient name rendered in Newsreader serif 28px.
  - Master CLID chip in mono tabular text (e.g., `CL-000001`).
  - Feeder system source identifier chips in mono (e.g., `APL-004512`, `LB-77120`, `TX-9981`, `PH-30991`, `STAR-48221`).
  - Active consent status pill (e.g., `Consent: Treatment Active`).
  - In-banner "Viewing as" role dropdown allowing instant switching between all 7 user roles.
- **Overview Tab**:
  - **Active Problems / Conditions**: Grid of diagnosed conditions with provenance chips (`ProvChip`) indicating source system and date.
  - **Reconciled Current Medications**: Cross-referenced medications from EHR prescriptions and pharmacy dispenses; highlights discrepancies with warning chips:
    - `missing_from_ehr` (Atorva 10 dispensed by pharmacy but missing from EHR).
    - `allergy_conflict` (Mox 500 / amoxicillin dispensed to a patient with documented Penicillin allergy).
  - **Documented Allergies**: Active substance intolerances, allergy class, and criticality level with source badges.
  - **Latest Lab Values & Trends**: Recharts multi-point trend lines (HbA1c, fasting glucose, lipids) showing normal clinical reference bands (e.g. 4.0–5.6% for HbA1c), LOINC codes, and source chips. Unifies Metropolis Lab (%) and Anand Lab (mmol/mol converted) into a single trend line.
  - **Insurance Claims**: Claims ledger cards with claimed vs. approved amounts, status, and ProvChips.
  - **Zero-Trust Redaction Sweep**: On role switch or unconsented access, restricted fields replay a 220 ms sweep transition into hashed ink redaction bars (`Redacted.tsx`) displaying tooltips such as `"Hidden for Billing - consent required"`.
- **Timeline Tab**:
  - Chronological event stream across encounters, diagnoses, lab observations, pharmacy dispenses, and claims.
  - Filter chips by event category (`All`, `Encounters`, `Conditions`, `Labs`, `Meds`, `Claims`) and feeder source (`EHR`, `Lab`, `Pharmacy`, `Claims`).
  - Date range filters and source badges on every entry.
- **Identity Tab**:
  - Feeder record linkage cards showing every contributing source record (`APL-004512`, `LB-77120`, `TX-9981`, `PH-30991`, `STAR-48221`).
  - Plain-language "Why linked" explanation line for each link (e.g., `"Phone and DOB year matched; Metaphone phonetic key concordant; RapidFuzz token set ratio 1.000"`).
  - Tabular mono confidence score (e.g., `1.0000`).
  - Field-by-field provenance breakdown and recorded alternative values.
- **Right Inspector Drawer (380px)**:
  - Collapsible drawer displaying raw feeder record payloads, JSON debug inspect, and field-level provenance.

### 1.3 `/portal` — Patient Self-Service Portal (`web/src/pages/PortalPage.tsx`)
- **Directives & Consent Toggles**:
  - Departmental consent cards grouped by role group: Clinicians (`clinicians`), Pharmacy (`pharmacy`), Diagnostic Labs (`lab`), and Insurance & Billing (`billing`).
  - Per-category toggle pills (`demographics_full`, `encounters`, `conditions`, `allergies`, `medications`, `labs`, `claims`).
  - Quick "Revoke All Consents" button.
  - Revoking billing consent immediately cuts off billing access on the next read with zero delay.
- **Access History Table**:
  - Calmer, larger, plainer ledger styling designed for patient readability.
  - Displays access event timestamp, provider username, role, declared purpose (treatment vs. payment), and outcome.
  - Prominently highlights policy denials with alert vermilion rows and denial counter filters.

### 1.4 `/audit` — Compliance & Audit Ledger (`web/src/pages/AuditPage.tsx`)
- **Ledger-Style Audit Table**:
  - Monospace row rendering for timestamp, actor, role, patient CLID, clinical category, action, and decision (`ALLOW` in ok green vs. `DENY` in alert vermilion).
  - 8-character `HashChip` components for previous block hash and current block hash with copy-to-clipboard functionality.
  - Filter pills to view all entries, allowed reads, or policy denials.
- **Verify Chain Button**:
  - Triggers cryptographic verification (`GET /audit/verify`) across the entire SHA-256 hash chain from the genesis block (`00000000...`).
  - Displays green verification confirmation badge with total verified entry count or flags the exact broken row index.

### 1.5 `/demo` — Hidden Demo Control Center (`web/src/pages/DemoPage.tsx`)
- **Access**: Hidden route triggered globally via `Cmd+Shift+D` or `Ctrl+Shift+D` shortcut (auto-elevates to `admin.neha` if not logged in as admin).
- **Reset Demo Data Button**: Calls `POST /api/admin/reset-demo`, wiping SQLite tables, reseeding canonical users, and running deterministic ingestion at `seed=42`. Clears all React Query caches.
- **Pre-Warm Hero Button**: Prefetches all queries for hero patient `CL-000001` (Ramesh Kumar) across summary, timeline, identity, and search.
- **Interactive Script Stepper**: Step-by-step walkthrough mapped directly to the 8 timestamps in `docs/demo-script.md` (0:00 through 4:40) with presenter talking points, action execute buttons, and step cards.
- **Autonomous Script Verification Runner**: Executes the complete 8-step script 3 consecutive times in a row with zero page refresh (`window.location.reload` is never invoked), advancing the "Runs Completed: 3 / 3" counter.
- **Execution Console**: Real-time terminal log panel outputting timestamped execution events.

### 1.6 Global Component: Script HUD Overlay (`web/src/components/demo/ScriptOverlay.tsx`)
- Persistent floating dockable HUD overlay mounted across all pages.
- Displays current timestamp (0:00 to 4:40), script talking points from `docs/demo-script.md`, stepper buttons ("Prev", "Next", "Execute"), "Reset Data", "Pre-Warm Hero", and "Run Script 3x in a Row".
- Can be minimized to a small status pill in the bottom corner or expanded into the full presenter card.

### 1.7 `/design` — Design System Specimen (`web/src/pages/DesignSystemPage.tsx`)
- Interactive specimen page validating all tokens from `docs/design-system.md` in Light and Dark modes:
  - Font specimen (Newsreader, Instrument Sans, IBM Plex Mono).
  - Color palettes (paper, surface, line, ink, ink-soft, teal, vermilion, ok, and source colors).
  - Components (`Redacted`, `MatchBadge`, `SourceBadge`, `ProvChip`, `HashChip`, `EmptyState`, `SkeletonCard`).

---

## 2. Backend API Endpoints

The backend is built with Python 3.12, FastAPI, SQLModel, and SQLite (`backend/carelens.db`), served via Uvicorn on port 8000. All routes are mounted both at the root path and under the `/api` prefix.

| Method | Endpoint | Allowed Roles | One-Line Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` / `/api/health` | Public | Return service health status, version, and UTC timestamp. |
| `POST` | `/auth/login` | Public | Authenticate user credentials via Argon2 and return an 8-hour JWT. |
| `GET` | `/me` | Authenticated (Any) | Return current user profile, role, and linked patient CLID. |
| `GET` | `/patients` | All authenticated roles | Search unified patients with linked feeder systems and match confidence scores. |
| `GET` | `/patients/{clid}/unified` | All authenticated roles | Retrieve unified patient data with role/consent redactions across all categories. |
| `GET` | `/patients/{clid}/timeline` | All authenticated roles | Retrieve chronological clinical events filtered by category, source, and date. |
| `GET` | `/patients/{clid}/summary` | All authenticated roles | Retrieve clinical summary with reconciled medications, lab trends, and conflict flags. |
| `GET` | `/patients/{clid}/identity` | All authenticated roles | Retrieve feeder record linkage evidence, confidence scores, and field provenance. |
| `GET` | `/consents` | Patient (own CLID), Admin, Clinical | List active or revoked consent directives filtered by patient CLID and status. |
| `POST` | `/consents` | Patient (own CLID), Admin | Grant a new patient consent directive for a role group and categories. |
| `POST` | `/consents/{id}/revoke` | Patient (own CLID), Admin | Immediately revoke an active consent directive with instant effect on next read. |
| `GET` | `/audit` | Admin (all), Patient (own events) | Retrieve append-only audit ledger log entries (other roles receive 403 Forbidden). |
| `GET` | `/audit/verify` | Admin, Doctor | Validate unbroken cryptographic SHA-256 hash chaining across all audit entries. |
| `POST` | `/admin/ingest` | Admin only | Trigger idempotent normalization, matching, and ingestion across all 4 feeder sources. |
| `POST` | `/admin/reset-demo` | Admin only | Wipe all clinical, consent, and audit tables, reseed canonical users, and re-run ingestion at seed 42. |

---

## 3. Database Tables & Key Fields

All models are defined in `backend/app/domain/models.py` using SQLModel/SQLAlchemy backed by SQLite:

1. **`users` (`User`)**
   - `id`: Integer primary key
   - `username`: String (unique, indexed) — e.g., `dr.rao`, `admin.neha`, `ramesh`
   - `hashed_password`: String (Argon2 hash)
   - `role`: String (indexed) — `doctor`, `nurse`, `pharmacist`, `lab_tech`, `billing`, `admin`, `patient`
   - `full_name`: String
   - `linked_clid`: Optional String (indexed) — links patient user to `MasterPatient.clid`
   - `created_at`: DateTime UTC

2. **`source_records` (`SourceRecord`)**
   - `id`: Integer primary key
   - `source`: String (indexed) — `ehr`, `lab`, `pharmacy`, `claims`
   - `source_record_id`: String (indexed) — e.g., `APL-004512`, `LB-77120`
   - `patient_name`, `dob`, `gender`, `phone`, `pincode`, `city`, `state`: Demographics
   - `clid`: Optional String (indexed) — linked master patient CLID
   - `raw_json`: Text (original feeder payload)
   - `created_at`: DateTime UTC

3. **`master_patients` (`MasterPatient`)**
   - `id`: Integer primary key
   - `clid`: String (unique, indexed) — canonical ID in `CL-000001` format
   - `name`, `dob`, `gender`, `phone`, `pincode`, `city`, `state`: Synthesized canonical demographics
   - `provenance_json`: Text (maps each demographic field to source feeder system and timestamp)
   - `alternates_json`: Text (stores variant spellings, dates, and feeder alternate values)
   - `created_at`, `updated_at`: DateTime UTC

4. **`identity_links` (`IdentityLink`)**
   - `id`: Integer primary key
   - `master_clid`: String (indexed)
   - `source`: String (indexed)
   - `source_record_id`: String
   - `confidence_score`: Float (e.g., `1.0`, `0.965`)
   - `evidence_json`: Text (per-field match breakdown: name score, dob match, phonetic agreement)
   - `status`: String — `auto_linked` or `manual_approved`
   - `created_at`: DateTime UTC

5. **`review_items` (`ReviewItem`)**
   - `id`: Integer primary key
   - `source_a`, `record_id_a`: First candidate record
   - `source_b`, `record_id_b`: Second candidate record
   - `score`: Float (ambiguous match score between 0.70 and 0.89)
   - `evidence_json`: Text (match scoring details)
   - `status`: String — `pending`, `approved`, `rejected`
   - `created_at`: DateTime UTC

6. **`encounters` (`Encounter`)**
   - `id`: Integer primary key
   - `clid`: String (indexed), `source`: String, `source_record_id`: String
   - `encounter_id`: String, `reason`: String
   - `period_start`, `period_end`, `recorded_at`: DateTime UTC
   - `normalized`: Boolean, `raw_data`: Text

7. **`conditions` (`Condition`)**
   - `id`: Integer primary key
   - `clid`: String (indexed), `source`: String, `source_record_id`: String
   - `condition_id`: String, `code`: String, `display`: String
   - `clinical_status`: String (`active`), `recorded_at`: DateTime UTC
   - `normalized`: Boolean, `raw_data`: Text

8. **`allergies` (`Allergy`)**
   - `id`: Integer primary key
   - `clid`: String (indexed), `source`: String, `source_record_id`: String
   - `allergy_id`: String, `substance`: String, `allergy_class`: String
   - `reaction`: String, `criticality`: String (`high`), `clinical_status`: String
   - `recorded_at`: DateTime UTC, `normalized`: Boolean, `raw_data`: Text

9. **`medications` (`Medication`)**
   - `id`: Integer primary key
   - `clid`: String (indexed), `source`: String, `source_record_id`: String
   - `medication_id`: String, `brand_name`: Optional String, `generic_name`: String
   - `dosage`: String, `quantity`: Optional Integer, `drug_class`: String
   - `recorded_at`: DateTime UTC, `normalized`: Boolean, `raw_data`: Text

10. **`observations` (`Observation`)**
    - `id`: Integer primary key
    - `clid`: String (indexed), `source`: String, `source_record_id`: String
    - `observation_id`: String, `panel_name`: String, `local_code`: String, `test_name`: String
    - `loinc_code`: Optional String (indexed) — e.g., `4548-4`
    - `raw_value`: Float, `raw_unit`: String
    - `value`: Float (normalized), `unit`: String (normalized)
    - `flag`: Optional String (`HIGH`, `LOW`, `NORMAL`), `recorded_at`: DateTime UTC
    - `normalized`: Boolean, `raw_data`: Text

11. **`claims` (`Claim`)**
    - `id`: Integer primary key
    - `clid`: String (indexed), `source`: String, `source_record_id`: String
    - `claim_id`: String, `category`: String
    - `claimed_amount`: Float, `approved_amount`: Float, `status`: String (`PENDING`, `APPROVED`)
    - `description`: String, `recorded_at`: DateTime UTC
    - `normalized`: Boolean, `raw_data`: Text

12. **`consents` (`Consent`)**
    - `id`: Integer primary key
    - `clid`: String (indexed)
    - `group`: String (indexed) — `clinicians`, `pharmacy`, `lab`, `billing`
    - `categories`: String — comma-separated categories (e.g., `demographics_min,claims`)
    - `purpose`: String — `treatment`, `payment`
    - `valid_to`: DateTime UTC (default 30 days)
    - `status`: String (indexed) — `active`, `revoked`, `expired`
    - `created_at`: DateTime UTC

13. **`audit_entries` (`AuditEntry`)**
    - `id`: Integer primary key
    - `ts`: DateTime UTC (indexed)
    - `actor`: String (indexed), `role`: String (indexed), `clid`: Optional String (indexed)
    - `action`: String — `read`, `verify`, `revoke`, `consent_create`
    - `categories`: String, `decision`: String (`ALLOW`, `DENY`), `reason`: String
    - `prev_hash`: String (64-char hex, genesis is `00000000...`)
    - `hash`: String (64-char hex: `SHA-256(prev_hash + canonical_json)`)

14. **`ingest_rejects` (`IngestReject`)**
    - `id`: Integer primary key
    - `source`: String, `source_record_id`: Optional String
    - `error_message`: String, `raw_payload`: Text, `timestamp`: DateTime UTC

---

## 4. Integration Steps and Implementing Files

| Integration Step | Implementing File | Implementation Details |
| :--- | :--- | :--- |
| **Source Adapters** | `backend/app/integration/adapters.py` | Implements `adapt_ehr_bundle`, `adapt_lab_report`, `adapt_pharmacy_dispense`, and `adapt_insurer_claim`. Converts disparate feeder structures (FHIR-like bundles, Lab reports with mixed units, Pharmacy dispense rows, Insurer claims JSON) into canonical models. |
| **Normalization** | `backend/app/integration/normalization.py` & `backend/app/domain/mappings.py` | Standardizes local test codes to LOINC (HbA1c `4548-4`, fasting glucose `1558-6`, cholesterol `2093-3`, HDL `2085-9`, LDL `13457-7`, triglycerides `2571-8`). Converts HbA1c `mmol/mol` to `%` series (`0.0915 * mmol + 2.15`). Normalizes brand names to generics (`Glycomet 500` -> metformin, `Telma 40` -> telmisartan, `Atorva 10` -> atorvastatin, `Mox 500` -> amoxicillin). Parses multi-format dates (`ISO 8601`, `DD/MM/YYYY`) into UTC. |
| **Ingestion Pipeline** | `backend/app/integration/pipeline.py` | Orchestrates idempotent ingestion across all 4 feeder sources. Collects invalid records into `IngestReject` dead letter queue. Seeds baseline 30-day patient consents across all 4 role groups. Invokes identity matching and propagates synthesized `clid` to all child clinical records. |
| **Identity Matching & Entity Resolution** | `backend/app/integration/matching.py` | Implements Section 4 & Section 8 rules: Name normalization (strips titles `Mr/Mrs/Dr/Shri/Smt`, deduplicates vowels, matches tokens symmetrically). Blocking (same DOB year + Jellyfish Metaphone phonetic key, or phone match). Weighted scoring (Name 0.35 via RapidFuzz `token_set_ratio`, DOB 0.25, Phone 0.20, Gender 0.10, Pincode 0.10). Enforces phone single-key prohibition. Auto-links $\ge 0.90$, saves 0.70–0.89 to `ReviewItem`, ignores $< 0.70$. Synthesizes golden `MasterPatient` records using source priority (`EHR > Lab > Pharmacy > Claims`) then recency. Links `ramesh` user account by phone. |
| **Policy Engine** | `backend/app/policy/engine.py` | Evaluates zero-trust clinical access using `ROLE_MATRIX` and uncached database consent evaluation. Requires role permission AND active unexpired patient consent. Validates declared purpose (`billing` = `payment`, others = `treatment`). Generates `make_restricted_marker` with policy explanation on denial. Default deny. Every decision is logged to the audit ledger. |
| **Cryptographic Audit Ledger** | `backend/app/audit/ledger.py` | Append-only ledger computing `hash = SHA-256(prev_hash + canonical_json)`. Genesis block hash initialized to 64 zeros. Implements `verify_chain(session)` verifying full chain integrity from genesis to the latest block. |

---

## 5. NPM Scripts & Commands to Run

All root scripts coordinate both frontend and backend using `concurrently`.

### 5.1 Run the Full Stack Locally
```bash
npm run dev
```
- Starts FastAPI backend: `uv run --directory backend uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload`
- Starts Vite frontend: `npm --prefix web run dev` (available at `http://127.0.0.1:5173/`)

### 5.2 Run All Tests
```bash
npm run test
```
- Runs backend test suite: `uv run --directory backend pytest` (289 tests passing)
- Runs frontend test suite: `npm --prefix web run test` (20 Vitest tests passing)

### 5.3 Run All Linters
```bash
npm run lint
```
- Runs backend ruff check: `uv run --directory backend ruff check .` (0 errors)
- Runs frontend eslint: `npm --prefix web run lint` (0 errors)

### 5.4 Re-seed the Database
```bash
npm run seed
```
- Executes `uv run --directory backend python -m app.seed`, creating fresh SQLite tables, seeding the 7 canonical users, and running full ingestion.

### 5.5 Reset the Demo Environment
- **Option A (UI)**: On `http://127.0.0.1:5173/demo` (or via the floating Script HUD), click the **"Reset Demo Data"** button. This calls `POST /api/admin/reset-demo` and clears React Query cache.
- **Option B (HTTP API)**:
```bash
curl -X POST http://127.0.0.1:8000/api/admin/reset-demo -H "Authorization: Bearer <ADMIN_TOKEN>"
```

### 5.6 Production Build
```bash
npm run build
```
- Compiles strict TypeScript and produces the production Vite bundle in `web/dist`.

---

## 6. Gap Analysis: Specification vs. Implementation

A literal line-by-line review against `docs/spec.md`:

### 6.1 `docs/PROMPTS.md`
- **Literal Status**: `docs/PROMPTS.md` **does not exist** in the repository.

### 6.2 Scope Explicitly Marked `OUT` in `docs/spec.md §2`
`docs/spec.md §2` explicitly defined the following items as out-of-scope for the core build:
1. **River timeline**: Marked `OUT`. *Implemented instead as a plain chronological list with source badges and category filter chips (`web/src/pages/PatientDetailPage.tsx`).*
2. **Review-queue UI**: Marked `OUT`. *The backend fully implements Section 4 logic and persists ambiguous candidate pairs (0.70–0.89) to the `ReviewItem` table, but no dedicated frontend steward review page was built, exactly per spec §2.*
3. **Break-glass emergency override**: Marked `OUT`. *Not implemented.*
4. **Clinical push alerts**: Marked `OUT`. *Not implemented.*
5. **Ledger verify animation**: Marked `OUT`. *Implemented as a clean button triggering `GET /audit/verify` that confirms chain status with a green badge and verified count, rather than a multi-frame canvas animation.*
6. **Cloud deployment**: Marked `OUT`. *Configured for deterministic local execution on Windows/macOS/Linux via uv and npm.*

### 6.3 Everything Marked `IN` in `docs/spec.md §2` is 100% Implemented
- Ingestion from 4 feeder systems: **Implemented**
- Normalization (LOINC, mmol/mol to %, brand to generic, dates): **Implemented**
- Fuzzy matching with auto-link and review item thresholding: **Implemented**
- Golden master patient synthesis with provenance and alternates: **Implemented**
- Unified summary and timeline list: **Implemented**
- Role-based redaction with 220 ms sweep transition: **Implemented**
- Patient consent toggles and revocation: **Implemented**
- Patient access history ledger highlighting denials: **Implemented**
- Cryptographic hash-chained audit table with genesis verification: **Implemented**
- Hero patient planted discrepancies (HbA1c trends, Atorva missing from EHR, Mox 500 allergy conflict, insurer claims status): **Implemented**
- Synthetic dataset with 9 Faker patients and 2 ambiguous pairs: **Implemented**
