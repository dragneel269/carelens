# Demo Script — CareLens Neighbourhood (4 minutes)

Pitch: "ABDM connects hospitals to the nation. CareLens connects your doctor to your chemist, no national ID required."

0:00 Setup: Priya Nair, 32, Mysuru. Penicillin allergy documented in HealthPoint Clinic EHR. Visits standalone Chemist Corner to fill sinusitis medication.
0:25 Chemist Imran Khan logs in → Chemist Counter (/counter) → searches "Priya" (phone: 90000 55001). Identity engine matches clinic and chemist records without national IDs.
0:45 Simulated OTP Consent: Priya receives simulated SMS. Imran confirms 6-digit OTP → 24-hour time-boxed counter consent created on the cryptographic ledger.
1:05 Drug Safety Alert: 🔴 CRITICAL ALLERGY CONFLICT — Augmentin 625 (amoxicillin-clavulanate, penicillin class) conflicts with documented allergy ("Hives and throat swelling"). Chemist halts dispense and contacts clinic.
1:30 Doctor View: Dr. Ramesh Rao logs in → /patient/CL-000011 (Priya Nair) → sees real-time synchronized clinical chart and the active conflict flag.
1:55 Refill Gap Alerts: Clinician navigates to /followups → Suresh Pai (CL-000012) flagged with chronic Metformin 24 days overdue. One-click simulated reminder SMS dispatched.
2:20 Zero-Trust Redaction: Switch "Viewing as" Pharmacist (claims and unrelated diagnoses redacted) → switch to Billing (clinical medications and allergies redacted).
2:45 Patient Portal: Priya opens /portal → revokes Counter consent for Chemist Corner.
3:10 Instant Enforcement: Chemist Imran refreshes /counter → access immediately blocked ("Patient Consent Required — Request New OTP"). Zero caching.
3:30 Tamper-Evident Audit: Admin Neha views /audit ledger → OTP consent generation, counter check, and patient revocation recorded with previous and current block hashes. Clicks "Verify Chain" → contiguous cryptographic integrity confirmed against genesis.
3:50 Close: No national ID. No ABHA dependency. Doctor ↔ Chemist continuity of care, patient in control, every transaction audited.