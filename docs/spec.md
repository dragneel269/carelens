# CareLens spec (solo, 2-day core)

## 1 What it does
Ingests records from four systems (hospital EHR, lab, pharmacy, insurer), decides which
records are the same person without a national ID, builds one golden record with a timeline
and summary, and lets a policy engine plus patient consent decide who sees what. Every
access is logged in a hash-chained audit log.

## 2 Scope
IN: ingestion, normalization, fuzzy matching with auto-link, golden record, unified summary
and timeline list, role-based redaction, patient consent toggles and revoke, access history,
audit table.
OUT (hackathon day): river timeline, review-queue UI, break-glass, alerts, ledger verify
animation, cloud deploy.

## 3 Users (login by badge, password for all: carelens-demo)
dr.rao doctor | nurse.geeta nurse | pharm.imran pharmacist | lab.divya lab_tech |
billing.sunil billing | admin.neha admin | ramesh patient

## 4 Identity engine
Normalize names: lowercase, strip Mr/Mrs/Dr/Shri/Smt, treat "R Kumar" and "Kumar R" as the
same tokens, collapse repeated vowels (Kumar/Kumaar).
Block: compare only pairs with the same DOB year plus phonetic name key, or the same phone.
Score: name 0.35 (rapidfuzz token_set_ratio), DOB 0.25, phone 0.20, gender 0.10,
pincode 0.10. Phone is never a sole key.
Decide: >= 0.90 auto-link; 0.70-0.89 stays separate and is saved as a ReviewItem;
< 0.70 ignore. Same-system source IDs always link.
Golden record: choose each field by source priority (EHR, lab, pharmacy, claims) then
recency; keep alternates with provenance. Every link stores per-field evidence.

## 5 Data model (SQLModel)
User, MasterPatient(clid, name, dob, gender, phone, pincode), SourceRecord, IdentityLink,
ReviewItem, Encounter, Condition, Allergy, Medication, Observation, Claim (each with clid,
source, source_record_id, recorded_at, normalized), Consent(clid, group, categories,
purpose, valid_to, status), AuditEntry(ts, actor, role, clid, action, categories, decision,
reason, prev_hash, hash).

## 6 API
POST /auth/login | GET /me
GET /patients?q=  (each hit: linked_systems, best_score)
GET /patients/{clid}/unified | /timeline | /summary | /identity
GET /consents | POST /consents | POST /consents/{id}/revoke
GET /audit | GET /audit/verify
POST /admin/ingest | POST /admin/reset-demo
Every clinical item has source, recorded_at, and values or {"restricted": true, "reason": "..."}.

## 7 Policy
Categories: demographics_min (name, age, sex), demographics_full (DOB, phone, address),
encounters, conditions, allergies, medications, labs, claims.
doctor: all | nurse: all except claims | pharmacist: dem_min, allergies, medications |
lab_tech: dem_min, labs | billing: dem_min, claims | admin: audit only |
patient: own data, no consent needed.
Rule: allow only if the matrix allows it AND the patient has an active unexpired consent for
that role group and category. Purpose: billing = payment, others = treatment. Default deny.
Denials are logged. Decisions are never cached.
Seed consents for every patient (valid 30 days): clinicians (their matrix), pharmacy
(allergies, medications, dem_min), lab (labs, dem_min), billing (claims, dem_min).

## 8 Seed data
Hero: Ramesh Kumar, DOB 1968-03-14, male, Mysuru 570001, fake phone 90000 12345.
Source IDs: EHR APL-004512, Lab A LB-77120, Lab B TX-9981, Pharmacy PH-30991, Insurer STAR-48221.
EHR: type 2 diabetes, hypertension, penicillin allergy, 3 encounters, metformin, telmisartan.
Lab A (local codes, %): "GLYCO HB" 8.4% June, 7.9% Sept; fasting glucose mg/dL; lipid panel 14 Sep.
Lab B: HbA1c 63 mmol/mol Aug; lipid panel 24 Sep (duplicate within 12 days).
Pharmacy (brands): "Glycomet 500" dispensed once in June; "Mox 500" (amoxicillin) dispensed
Sept (allergy conflict); "Atorva 10" dispensed but missing from the EHR (conflict).
Insurer: two claims, one approved, one pending.
Name variants: Ramesh Kumar / Ramesh Kumaar / R. Kumar. DOB as 14/03/1968 and 1968-03-14.
One record has no phone.
Plus 9 Faker patients (Indian names, 2-4 systems each) and 2 deliberately ambiguous pairs
(same name, different DOB or pincode) that must NOT auto-link.

## 9 Normalization
LOINC-style codes (verify before presenting): HbA1c 4548-4, fasting glucose 1558-6, total
cholesterol 2093-3, HDL 2085-9, LDL 13457-7, triglycerides 2571-8.
HbA1c % = 0.0915 x mmol/mol + 2.15 (63 gives about 7.9). Glucose and lipids in mg/dL.
Brands: Glycomet 500 = metformin; Telma 40 = telmisartan; Atorva 10 = atorvastatin;
Mox 500 = amoxicillin (class: penicillin). Dates as ISO 8601.