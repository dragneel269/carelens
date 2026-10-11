"""Identity engine for cross-system patient record matching and golden record synthesis.

Implements Section 4 and Section 8 of the specification:
- Name normalization: lowercase, strip titles, collapse repeated vowels, symmetrical token matching.
- Blocking: DOB year + phonetic key (jellyfish metaphone), or phone match.
- Weighted scoring: name 0.35 (rapidfuzz), DOB 0.25, phone 0.20, gender 0.10, pincode 0.10.
- Constraints: phone is never a sole key; never auto-link below 0.90; same-system IDs always link.
- Decision: >= 0.90 auto-link; 0.70-0.89 ReviewItem; < 0.70 ignore.
- Golden record: choose each field by source priority (EHR, lab, pharmacy, claims) then recency;
  keep alternates with provenance. Every link stores per-field evidence.
- Set ramesh's linked_clid by phone match after linking.
"""

import json
import re
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

import jellyfish
from rapidfuzz import fuzz
from sqlmodel import Session, delete, select

from app.domain.models import (
    Allergy,
    Claim,
    Condition,
    Encounter,
    IdentityLink,
    MasterPatient,
    Medication,
    Observation,
    ReviewItem,
    SourceRecord,
    User,
)

# Honorific titles to strip during name normalization
TITLES: Set[str] = {
    "mr",
    "mrs",
    "ms",
    "miss",
    "dr",
    "shri",
    "smt",
    "shree",
    "master",
    "prof",
}

# Source priority order for golden record synthesis
SOURCE_PRIORITY: Dict[str, int] = {
    "ehr": 1,
    "lab": 2,
    "pharmacy": 3,
    "claims": 4,
}


def collapse_repeated_vowels(word: str) -> str:
    """Collapse consecutive duplicate vowels: 'kumaar' -> 'kumar', 'geeta' -> 'geta'."""
    return re.sub(r"([aeiou])\1+", r"\1", word, flags=re.IGNORECASE)


def normalize_name(name: Optional[str]) -> str:
    """Normalize patient name per section 4:

    - Lowercase
    - Strip punctuation and honorific titles (Mr/Mrs/Dr/Shri/Smt)
    - Collapse repeated vowels (Kumar/Kumaar)
    - Symmetrical token ordering: 'R Kumar' and 'Kumar R' produce the same tokens
    """
    if not name:
        return ""

    # Replace punctuation (dots, hyphens) with spaces and lowercase
    cleaned = re.sub(r"[^\w\s]", " ", name.lower())
    raw_tokens = cleaned.split()

    # Filter out titles
    content_tokens = [t for t in raw_tokens if t not in TITLES]
    if not content_tokens:
        content_tokens = raw_tokens

    # Collapse repeated vowels for each token
    collapsed = [collapse_repeated_vowels(t) for t in content_tokens]

    # Symmetrical token sorting ensures "R Kumar" and "Kumar R" produce identical normalized strings
    collapsed.sort()
    return " ".join(collapsed)


def get_name_tokens(name: Optional[str]) -> List[str]:
    """Return sorted normalized name tokens."""
    norm = normalize_name(name)
    return norm.split() if norm else []


def phonetic_key(name: Optional[str]) -> str:
    """Generate phonetic key using jellyfish metaphone for blocking."""
    tokens = get_name_tokens(name)
    if not tokens:
        return ""
    # Compute metaphone for each token and sort
    meta_tokens = [jellyfish.metaphone(t) for t in tokens if t]
    return " ".join(sorted(meta_tokens))


def get_phonetic_tokens(name: Optional[str]) -> Set[str]:
    """Return set of phonetic tokens for a name."""
    tokens = get_name_tokens(name)
    return {jellyfish.metaphone(t) for t in tokens if t}


def clean_phone(phone: Optional[str]) -> Optional[str]:
    """Extract digits from phone number; return last 10 digits if valid."""
    if not phone:
        return None
    digits = re.sub(r"\D", "", phone)
    if len(digits) >= 10:
        return digits[-10:]
    return None


def extract_year(dob: Optional[str]) -> Optional[str]:
    """Extract 4-digit birth year from ISO YYYY-MM-DD or DD/MM/YYYY."""
    if not dob:
        return None
    # Check YYYY-MM-DD
    m_iso = re.match(r"^(\d{4})[-\/]", dob.strip())
    if m_iso:
        return m_iso.group(1)
    # Check DD/MM/YYYY
    m_dmy = re.search(r"[-\/](\d{4})$", dob.strip())
    if m_dmy:
        return m_dmy.group(1)
    return None


def standardize_dob(dob: Optional[str]) -> Optional[str]:
    """Convert DOB into ISO YYYY-MM-DD format."""
    if not dob:
        return None
    dob_clean = dob.strip()
    # Check YYYY-MM-DD
    if re.match(r"^\d{4}-\d{2}-\d{2}$", dob_clean):
        return dob_clean
    # Check DD/MM/YYYY
    m_dmy = re.match(r"^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$", dob_clean)
    if m_dmy:
        d, m, y = m_dmy.groups()
        return f"{int(y):04d}-{int(m):02d}-{int(d):02d}"
    return dob_clean


def should_block(record_a: SourceRecord, record_b: SourceRecord) -> bool:
    """Blocking function per section 4:

    Compare only pairs with:
    1. The same phone number (if non-empty), OR
    2. The same DOB year PLUS phonetic name key match.
    """
    # 1. Phone match
    phone_a = clean_phone(record_a.phone)
    phone_b = clean_phone(record_b.phone)
    if phone_a and phone_b and phone_a == phone_b:
        return True

    # 2. Same DOB year + phonetic name key match
    year_a = extract_year(record_a.dob)
    year_b = extract_year(record_b.dob)
    if year_a and year_b and year_a == year_b:
        phonetic_a = get_phonetic_tokens(record_a.patient_name)
        phonetic_b = get_phonetic_tokens(record_b.patient_name)
        # Check if they share any phonetic name token
        if phonetic_a and phonetic_b and (phonetic_a & phonetic_b):
            return True

    return False


def match_name_tokens(tokens_a: List[str], tokens_b: List[str]) -> float:
    """Calculate token similarity accounting for single-letter initials."""
    if not tokens_a or not tokens_b:
        return 0.0

    str_a = " ".join(tokens_a)
    str_b = " ".join(tokens_b)

    # Base similarity via rapidfuzz token_set_ratio
    base_ratio = fuzz.token_set_ratio(str_a, str_b) / 100.0

    # Initial matching check: e.g. ["kumar", "r"] vs ["kumar", "ramesh"]
    # If one has an initial that matches the first letter of a token in the other,
    # and all other tokens match, treat as a strong name match.
    len_a, len_b = len(tokens_a), len(tokens_b)
    if len_a == len_b:
        matched = 0
        for ta in tokens_a:
            for tb in tokens_b:
                if ta == tb:
                    matched += 1
                    break
                elif (len(ta) == 1 and tb.startswith(ta)) or (len(tb) == 1 and ta.startswith(tb)):
                    matched += 1
                    break
        if matched == len_a:
            return max(base_ratio, 1.0)

    return base_ratio


def calculate_match_score(
    record_a: SourceRecord, record_b: SourceRecord
) -> Tuple[float, Dict[str, Any]]:
    """Weighted probabilistic match score per section 4:

    Weights:
      name:    0.35 (rapidfuzz token_set_ratio)
      dob:     0.25 (exact = 0.25, same year = 0.10)
      phone:   0.20 (exact clean 10-digit match)
      gender:  0.10 (normalized exact match)
      pincode: 0.10 (exact 6-digit match)

    Same-system source IDs always link (score 1.0).
    Phone is never a sole key.
    """
    evidence: Dict[str, Any] = {}

    # Rule: Same-system source IDs always link
    if (
        record_a.source == record_b.source
        and record_a.source_record_id == record_b.source_record_id
    ):
        evidence["same_system"] = True
        evidence["reason"] = "Same-system source IDs always link"
        return 1.0, evidence

    # Available weights sum up to 1.0; used to normalize when optional fields are absent
    available_weights = 0.0
    raw_score = 0.0

    # 1. Name match (weight 0.35)
    tokens_a = get_name_tokens(record_a.patient_name)
    tokens_b = get_name_tokens(record_b.patient_name)
    name_sim = match_name_tokens(tokens_a, tokens_b)
    name_score = name_sim * 0.35
    raw_score += name_score
    available_weights += 0.35
    evidence["name"] = {
        "value_a": record_a.patient_name,
        "value_b": record_b.patient_name,
        "similarity": round(name_sim, 4),
        "score": round(name_score, 4),
        "weight": 0.35,
    }

    # 2. DOB match (weight 0.25)
    dob_std_a = standardize_dob(record_a.dob)
    dob_std_b = standardize_dob(record_b.dob)
    if dob_std_a and dob_std_b:
        available_weights += 0.25
        if dob_std_a == dob_std_b:
            dob_score = 0.25
            dob_sim = 1.0
        elif extract_year(dob_std_a) == extract_year(dob_std_b):
            dob_score = 0.10
            dob_sim = 0.40
        else:
            dob_score = 0.0
            dob_sim = 0.0
        raw_score += dob_score
        evidence["dob"] = {
            "value_a": dob_std_a,
            "value_b": dob_std_b,
            "similarity": dob_sim,
            "score": round(dob_score, 4),
            "weight": 0.25,
        }
    else:
        evidence["dob"] = {"value_a": dob_std_a, "value_b": dob_std_b, "score": 0.0, "weight": 0.0}

    # 3. Phone match (weight 0.20)
    phone_clean_a = clean_phone(record_a.phone)
    phone_clean_b = clean_phone(record_b.phone)
    if phone_clean_a and phone_clean_b:
        available_weights += 0.20
        if phone_clean_a == phone_clean_b:
            phone_score = 0.20
            phone_sim = 1.0
        else:
            phone_score = 0.0
            phone_sim = 0.0
        raw_score += phone_score
        evidence["phone"] = {
            "value_a": record_a.phone,
            "value_b": record_b.phone,
            "similarity": phone_sim,
            "score": round(phone_score, 4),
            "weight": 0.20,
        }
    else:
        evidence["phone"] = {
            "value_a": record_a.phone,
            "value_b": record_b.phone,
            "score": 0.0,
            "weight": 0.0,
        }

    # 4. Gender match (weight 0.10)
    gender_a = (record_a.gender or "").strip().lower()
    gender_b = (record_b.gender or "").strip().lower()
    norm_gender_a = "M" if gender_a.startswith("m") else ("F" if gender_a.startswith("f") else None)
    norm_gender_b = "M" if gender_b.startswith("m") else ("F" if gender_b.startswith("f") else None)

    if norm_gender_a and norm_gender_b:
        available_weights += 0.10
        if norm_gender_a == norm_gender_b:
            gender_score = 0.10
            gender_sim = 1.0
        else:
            gender_score = 0.0
            gender_sim = 0.0
        raw_score += gender_score
        evidence["gender"] = {
            "value_a": record_a.gender,
            "value_b": record_b.gender,
            "similarity": gender_sim,
            "score": round(gender_score, 4),
            "weight": 0.10,
        }
    else:
        evidence["gender"] = {
            "value_a": record_a.gender,
            "value_b": record_b.gender,
            "score": 0.0,
            "weight": 0.0,
        }

    # 5. Pincode match (weight 0.10)
    pin_a = (record_a.pincode or "").strip()
    pin_b = (record_b.pincode or "").strip()
    if pin_a and pin_b:
        available_weights += 0.10
        if pin_a == pin_b:
            pincode_score = 0.10
            pincode_sim = 1.0
        else:
            pincode_score = 0.0
            pincode_sim = 0.0
        raw_score += pincode_score
        evidence["pincode"] = {
            "value_a": pin_a,
            "value_b": pin_b,
            "similarity": pincode_sim,
            "score": round(pincode_score, 4),
            "weight": 0.10,
        }
    else:
        evidence["pincode"] = {
            "value_a": pin_a,
            "value_b": pin_b,
            "score": 0.0,
            "weight": 0.0,
        }

    # Normalize score by available weights if optional fields are missing
    if available_weights > 0:
        final_score = raw_score / available_weights
    else:
        final_score = 0.0

    # CONSTRAINT: Phone is never a sole key!
    # If only phone matches (name similarity < 0.50 or DOB mismatch),
    # clamp score below auto-link threshold.
    if name_sim < 0.50 and final_score >= 0.90:
        final_score = 0.60

    evidence["raw_score"] = round(raw_score, 4)
    evidence["final_score"] = round(final_score, 4)
    evidence["available_weights"] = round(available_weights, 4)

    return round(final_score, 4), evidence


class DisjointSet:
    """Disjoint-set (Union-Find) data structure with path compression."""

    def __init__(self, items: List[int]) -> None:
        self.parent: Dict[int, int] = {item: item for item in items}
        self.rank: Dict[int, int] = {item: 0 for item in items}

    def find(self, item: int) -> int:
        if self.parent[item] != item:
            self.parent[item] = self.find(self.parent[item])
        return self.parent[item]

    def union(self, item_a: int, item_b: int) -> None:
        root_a = self.find(item_a)
        root_b = self.find(item_b)
        if root_a != root_b:
            if self.rank[root_a] < self.rank[root_b]:
                self.parent[root_a] = root_b
            elif self.rank[root_a] > self.rank[root_b]:
                self.parent[root_b] = root_a
            else:
                self.parent[root_b] = root_a
                self.rank[root_a] += 1


def build_golden_record(cluster_records: List[SourceRecord], clid: str) -> MasterPatient:
    """Synthesize golden master patient record from linked source records per Section 4.

    Field selection rule:
    Choose each demographic field by source priority (EHR, Lab, Pharmacy, Claims) then recency.
    Keep alternate values with provenance tracking.
    """
    # Sort records by source priority (EHR=1, Lab=2, Pharmacy=3, Claims=4), then recency descending
    sorted_records = sorted(
        cluster_records,
        key=lambda r: (
            SOURCE_PRIORITY.get(r.source, 99),
            -r.created_at.timestamp() if r.created_at else 0,
        ),
    )

    provenance: Dict[str, str] = {}
    alternates: Dict[str, List[Dict[str, Any]]] = defaultdict(list)

    fields = ["name", "dob", "gender", "phone", "pincode", "city", "state"]
    chosen_values: Dict[str, Any] = {}

    for field in fields:
        canonical_val: Optional[str] = None
        for rec in sorted_records:
            val = getattr(rec, "patient_name" if field == "name" else field)
            if val is not None and str(val).strip() != "":
                if field == "dob":
                    val = standardize_dob(val)
                elif field == "gender":
                    g_lower = val.lower()
                    if g_lower.startswith("m"):
                        val = "male"
                    elif g_lower.startswith("f"):
                        val = "female"

                if canonical_val is None:
                    canonical_val = val
                    provenance[field] = rec.source
                elif val != canonical_val:
                    # Record distinct alternate value
                    alt_entry = {
                        "value": val,
                        "source": rec.source,
                        "source_record_id": rec.source_record_id,
                    }
                    if alt_entry not in alternates[field]:
                        alternates[field].append(alt_entry)

        chosen_values[field] = canonical_val

    return MasterPatient(
        clid=clid,
        name=chosen_values.get("name") or "Unknown Patient",
        dob=chosen_values.get("dob"),
        gender=chosen_values.get("gender"),
        phone=chosen_values.get("phone"),
        pincode=chosen_values.get("pincode"),
        city=chosen_values.get("city"),
        state=chosen_values.get("state"),
        provenance_json=json.dumps(provenance),
        alternates_json=json.dumps(dict(alternates)),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


def run_identity_engine(session: Session) -> Dict[str, Any]:
    """Execute complete identity resolution, linking, and golden record creation.

    - Blocks and scores candidate record pairs across all feeders.
    - Thresholds: >= 0.90 auto-links; 0.70 to 0.89 ReviewItem only; < 0.70 ignores.
    - Creates MasterPatient records with CL-000001 style IDs (Hero first).
    - Creates IdentityLink with per-field evidence.
    - Updates clid on SourceRecord and all child clinical entities.
    - Associates user 'ramesh' with hero's CLID by phone match.
    """
    records = session.exec(select(SourceRecord)).all()
    if not records:
        return {"master_patients": 0, "identity_links": 0, "review_items": 0}

    # Map record IDs for Union-Find
    record_map: Dict[int, SourceRecord] = {r.id: r for r in records if r.id is not None}
    item_ids = list(record_map.keys())
    uf = DisjointSet(item_ids)

    candidate_reviews: List[Tuple[SourceRecord, SourceRecord, float, Dict[str, Any]]] = []
    link_evidence_map: Dict[Tuple[int, int], Tuple[float, Dict[str, Any]]] = {}

    n = len(records)
    for i in range(n):
        for j in range(i + 1, n):
            rec_a = records[i]
            rec_b = records[j]

            # Same-system IDs always link
            if rec_a.source == rec_b.source and rec_a.source_record_id == rec_b.source_record_id:
                uf.union(rec_a.id, rec_b.id)
                continue

            # Check blocking condition
            if not should_block(rec_a, rec_b):
                continue

            score, evidence = calculate_match_score(rec_a, rec_b)

            if score >= 0.90:
                # Auto-link threshold met
                uf.union(rec_a.id, rec_b.id)
                link_evidence_map[(rec_a.id, rec_b.id)] = (score, evidence)
                link_evidence_map[(rec_b.id, rec_a.id)] = (score, evidence)
            elif 0.70 <= score < 0.90:
                # Ambiguous pair -> save as ReviewItem only
                candidate_reviews.append((rec_a, rec_b, score, evidence))

    # Form clusters
    clusters_dict: Dict[int, List[SourceRecord]] = defaultdict(list)
    for r_id, rec in record_map.items():
        root = uf.find(r_id)
        clusters_dict[root].append(rec)

    # Sort clusters to ensure Hero patient Ramesh Kumar is CL-000001
    # Hero is identified by phone "90000 12345" or Apollo EHR ID "APL-004512"
    def is_hero_cluster(cl_records: List[SourceRecord]) -> bool:
        for r in cl_records:
            if clean_phone(r.phone) == "9000012345":
                return True
            if r.source == "ehr" and r.source_record_id == "APL-004512":
                return True
        return False

    all_clusters = list(clusters_dict.values())
    hero_clusters = [c for c in all_clusters if is_hero_cluster(c)]
    other_clusters = [c for c in all_clusters if not is_hero_cluster(c)]

    sorted_clusters: List[List[SourceRecord]] = []
    if hero_clusters:
        sorted_clusters.extend(hero_clusters)
    sorted_clusters.extend(other_clusters)

    # Clear existing identity structures
    session.exec(delete(IdentityLink))
    session.exec(delete(ReviewItem))
    session.exec(delete(MasterPatient))
    session.commit()

    master_patient_count = 0
    identity_link_count = 0
    hero_clid: Optional[str] = None

    for idx, cluster in enumerate(sorted_clusters, start=1):
        clid = f"CL-{idx:06d}"
        if is_hero_cluster(cluster):
            hero_clid = clid

        golden_patient = build_golden_record(cluster, clid)
        session.add(golden_patient)
        master_patient_count += 1

        for rec in cluster:
            # Update SourceRecord clid
            rec.clid = clid
            session.add(rec)

            # Find best match evidence for this record within cluster
            best_score = 1.0
            best_evidence: Dict[str, Any] = {"match_type": "seed_primary"}
            for other in cluster:
                if other.id != rec.id and (rec.id, other.id) in link_evidence_map:
                    s, ev = link_evidence_map[(rec.id, other.id)]
                    if s >= best_score or best_score == 1.0:
                        best_score = s
                        best_evidence = ev

            link = IdentityLink(
                master_clid=clid,
                source=rec.source,
                source_record_id=rec.source_record_id,
                confidence_score=best_score,
                evidence_json=json.dumps(best_evidence),
                status="auto_linked",
                created_at=datetime.now(timezone.utc),
            )
            session.add(link)
            identity_link_count += 1

            # Propagate CLID to clinical child entities
            _propagate_clid(session, rec.source, rec.source_record_id, clid)

    # Save ReviewItems for candidate pairs that were NOT merged into the same cluster
    review_item_count = 0
    saved_pairs: Set[Tuple[str, str, str, str]] = set()

    for rec_a, rec_b, score, evidence in candidate_reviews:
        # Check if they ended up in different clusters
        root_a = uf.find(rec_a.id)
        root_b = uf.find(rec_b.id)
        if root_a != root_b:
            pair_key = (
                min(rec_a.source, rec_b.source),
                min(rec_a.source_record_id, rec_b.source_record_id),
                max(rec_a.source, rec_b.source),
                max(rec_a.source_record_id, rec_b.source_record_id),
            )
            if pair_key not in saved_pairs:
                saved_pairs.add(pair_key)
                rev = ReviewItem(
                    source_a=rec_a.source,
                    record_id_a=rec_a.source_record_id,
                    source_b=rec_b.source,
                    record_id_b=rec_b.source_record_id,
                    score=score,
                    evidence_json=json.dumps(evidence),
                    status="pending",
                    created_at=datetime.now(timezone.utc),
                )
                session.add(rev)
                review_item_count += 1

    # Associate User 'ramesh' with Hero CLID
    if hero_clid:
        ramesh_user = session.exec(select(User).where(User.username == "ramesh")).first()
        if ramesh_user:
            ramesh_user.linked_clid = hero_clid
            session.add(ramesh_user)

    session.commit()

    return {
        "master_patients": master_patient_count,
        "identity_links": identity_link_count,
        "review_items": review_item_count,
        "hero_clid": hero_clid,
    }


def _propagate_clid(session: Session, source: str, source_record_id: str, clid: str) -> None:
    """Propagate the resolved CLID to all clinical entities associated with a source record."""
    # Encounters
    encs = session.exec(
        select(Encounter).where(
            Encounter.source == source,
            Encounter.source_record_id == source_record_id,
        )
    ).all()
    for e in encs:
        e.clid = clid
        session.add(e)

    # Conditions
    conds = session.exec(
        select(Condition).where(
            Condition.source == source,
            Condition.source_record_id == source_record_id,
        )
    ).all()
    for c in conds:
        c.clid = clid
        session.add(c)

    # Allergies
    algs = session.exec(
        select(Allergy).where(
            Allergy.source == source,
            Allergy.source_record_id == source_record_id,
        )
    ).all()
    for a in algs:
        a.clid = clid
        session.add(a)

    # Medications
    meds = session.exec(
        select(Medication).where(
            Medication.source == source,
            Medication.medication_id.isnot(None),
            Medication.source_record_id == source_record_id,
        )
    ).all()
    for m in meds:
        m.clid = clid
        session.add(m)

    # Observations
    obs = session.exec(
        select(Observation).where(
            Observation.source == source,
            Observation.source_record_id == source_record_id,
        )
    ).all()
    for o in obs:
        o.clid = clid
        session.add(o)

    # Claims
    clms = session.exec(
        select(Claim).where(
            Claim.source == source,
            Claim.source_record_id == source_record_id,
        )
    ).all()
    for cl in clms:
        cl.clid = clid
        session.add(cl)
