import json
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from sqlmodel import Session, select

from app.domain.models import (
    Allergy,
    Claim,
    Condition,
    Consent,
    Encounter,
    IngestReject,
    MasterPatient,
    Medication,
    Observation,
    SourceRecord,
)
from app.integration.adapters import (
    adapt_ehr_bundle,
    adapt_insurer_claim,
    adapt_lab_report,
    adapt_pharmacy_dispense,
)
from app.integration.matching import run_identity_engine
from app.seed.generator import DATA_DIR, generate_all_datasets


def run_ingest(session: Session) -> Dict[str, Any]:
    """Execute idempotent ingestion of all 4 source feeder systems.

    Returns summary metrics of ingested entities.
    """
    # If raw data files are missing, generate them first
    if not (DATA_DIR / "ehr_records.json").exists():
        generate_all_datasets()

    stats: Dict[str, int] = {
        "source_records": 0,
        "encounters": 0,
        "conditions": 0,
        "allergies": 0,
        "medications": 0,
        "observations": 0,
        "claims": 0,
        "rejects": 0,
    }

    # 1. Ingest EHR datasets
    ehr_path = DATA_DIR / "ehr_records.json"
    if ehr_path.exists():
        with open(ehr_path, "r", encoding="utf-8") as f:
            ehr_list = json.load(f)

        for bundle in ehr_list:
            try:
                src_rec, encs, conds, algs, meds = adapt_ehr_bundle(bundle)

                # Idempotent SourceRecord insert
                existing_src = session.exec(
                    select(SourceRecord).where(
                        SourceRecord.source == "ehr",
                        SourceRecord.source_record_id == src_rec.source_record_id,
                    )
                ).first()
                if not existing_src:
                    session.add(src_rec)
                    stats["source_records"] += 1

                # Idempotent Encounters
                for enc in encs:
                    existing_enc = session.exec(
                        select(Encounter).where(
                            Encounter.source == "ehr",
                            Encounter.encounter_id == enc.encounter_id,
                        )
                    ).first()
                    if not existing_enc:
                        session.add(enc)
                        stats["encounters"] += 1

                # Idempotent Conditions
                for cond in conds:
                    existing_cond = session.exec(
                        select(Condition).where(
                            Condition.source == "ehr",
                            Condition.condition_id == cond.condition_id,
                        )
                    ).first()
                    if not existing_cond:
                        session.add(cond)
                        stats["conditions"] += 1

                # Idempotent Allergies
                for alg in algs:
                    existing_alg = session.exec(
                        select(Allergy).where(
                            Allergy.source == "ehr",
                            Allergy.allergy_id == alg.allergy_id,
                        )
                    ).first()
                    if not existing_alg:
                        session.add(alg)
                        stats["allergies"] += 1

                # Idempotent Medications
                for med in meds:
                    existing_med = session.exec(
                        select(Medication).where(
                            Medication.source == "ehr",
                            Medication.medication_id == med.medication_id,
                        )
                    ).first()
                    if not existing_med:
                        session.add(med)
                        stats["medications"] += 1

            except Exception as exc:
                reject = IngestReject(
                    source="ehr",
                    source_record_id=bundle.get("id"),
                    error_message=str(exc),
                    raw_payload=json.dumps(bundle)[:2000],
                )
                session.add(reject)
                stats["rejects"] += 1

    # 2. Ingest Lab datasets
    lab_path = DATA_DIR / "lab_records.json"
    if lab_path.exists():
        with open(lab_path, "r", encoding="utf-8") as f:
            lab_list = json.load(f)

        for report in lab_list:
            try:
                src_rec, obs_list = adapt_lab_report(report)

                existing_src = session.exec(
                    select(SourceRecord).where(
                        SourceRecord.source == "lab",
                        SourceRecord.source_record_id == src_rec.source_record_id,
                    )
                ).first()
                if not existing_src:
                    session.add(src_rec)
                    stats["source_records"] += 1

                for obs in obs_list:
                    existing_obs = session.exec(
                        select(Observation).where(
                            Observation.source == "lab",
                            Observation.observation_id == obs.observation_id,
                        )
                    ).first()
                    if not existing_obs:
                        session.add(obs)
                        stats["observations"] += 1

            except Exception as exc:
                reject = IngestReject(
                    source="lab",
                    source_record_id=report.get("source_patient_id"),
                    error_message=str(exc),
                    raw_payload=json.dumps(report)[:2000],
                )
                session.add(reject)
                stats["rejects"] += 1

    # 3. Ingest Pharmacy datasets
    pharm_path = DATA_DIR / "pharmacy_records.json"
    if pharm_path.exists():
        with open(pharm_path, "r", encoding="utf-8") as f:
            pharm_list = json.load(f)

        for disp in pharm_list:
            try:
                src_rec, med = adapt_pharmacy_dispense(disp)

                existing_src = session.exec(
                    select(SourceRecord).where(
                        SourceRecord.source == "pharmacy",
                        SourceRecord.source_record_id == src_rec.source_record_id,
                    )
                ).first()
                if not existing_src:
                    session.add(src_rec)
                    stats["source_records"] += 1

                existing_med = session.exec(
                    select(Medication).where(
                        Medication.source == "pharmacy",
                        Medication.medication_id == med.medication_id,
                    )
                ).first()
                if not existing_med:
                    session.add(med)
                    stats["medications"] += 1

            except Exception as exc:
                reject = IngestReject(
                    source="pharmacy",
                    source_record_id=disp.get("patient_id"),
                    error_message=str(exc),
                    raw_payload=json.dumps(disp)[:2000],
                )
                session.add(reject)
                stats["rejects"] += 1

    # 4. Ingest Insurer Claims datasets
    claims_path = DATA_DIR / "claims_records.json"
    if claims_path.exists():
        with open(claims_path, "r", encoding="utf-8") as f:
            claims_list = json.load(f)

        for claim_bundle in claims_list:
            try:
                src_rec, claims = adapt_insurer_claim(claim_bundle)

                existing_src = session.exec(
                    select(SourceRecord).where(
                        SourceRecord.source == "claims",
                        SourceRecord.source_record_id == src_rec.source_record_id,
                    )
                ).first()
                if not existing_src:
                    session.add(src_rec)
                    stats["source_records"] += 1

                for clm in claims:
                    existing_clm = session.exec(
                        select(Claim).where(
                            Claim.source == "claims",
                            Claim.claim_id == clm.claim_id,
                        )
                    ).first()
                    if not existing_clm:
                        session.add(clm)
                        stats["claims"] += 1

            except Exception as exc:
                reject = IngestReject(
                    source="claims",
                    source_record_id=claim_bundle.get("policyholder_id"),
                    error_message=str(exc),
                    raw_payload=json.dumps(claim_bundle)[:2000],
                )
                session.add(reject)
                stats["rejects"] += 1

    session.commit()

    # 5. Execute cross-system record linkage and golden patient synthesis
    matching_stats = run_identity_engine(session)
    stats.update(matching_stats)

    # 6. Seed Section 7 default consents for every patient (valid 30 days)
    consent_count = seed_default_consents(session)
    stats["consents"] = consent_count

    return stats


def seed_default_consents(session: Session) -> int:
    """Seed baseline active consents for all MasterPatients per spec §7.

    Valid 30 days:
    - clinicians: all clinical categories in doctor/nurse matrix (treatment)
    - pharmacy: demographics_min, allergies, medications (treatment)
    - lab: demographics_min, labs (treatment)
    - billing: demographics_min, claims (payment)
    """
    now = datetime.now(timezone.utc)
    valid_until = now + timedelta(days=30)

    patients = session.exec(select(MasterPatient)).all()
    count = 0

    consent_templates = [
        {
            "group": "clinicians",
            "categories": (
                "demographics_min,demographics_full,encounters,"
                "conditions,allergies,medications,labs,claims"
            ),
            "purpose": "treatment",
        },
        {
            "group": "pharmacy",
            "categories": "demographics_min,allergies,medications",
            "purpose": "treatment",
        },
        {
            "group": "lab",
            "categories": "demographics_min,labs",
            "purpose": "treatment",
        },
        {
            "group": "billing",
            "categories": "demographics_min,claims",
            "purpose": "payment",
        },
    ]

    for p in patients:
        for tpl in consent_templates:
            existing = session.exec(
                select(Consent).where(
                    Consent.clid == p.clid,
                    Consent.group == tpl["group"],
                    Consent.status == "active",
                )
            ).first()
            if not existing:
                consent = Consent(
                    clid=p.clid,
                    group=tpl["group"],
                    categories=tpl["categories"],
                    purpose=tpl["purpose"],
                    valid_to=valid_until,
                    status="active",
                    created_at=now,
                )
                session.add(consent)
                count += 1

    session.commit()
    return count
