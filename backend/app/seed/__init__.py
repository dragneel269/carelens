"""Seed package entry point and database initialization."""

from sqlmodel import Session, select

from app.core.security import get_password_hash
from app.db.session import create_db_and_tables, engine
from app.domain.models import User, UserRole
from app.seed.generator import generate_all_datasets
from app.seed.mappings import save_mappings_json

SEED_PASSWORD = "carelens-demo"

SEED_USERS = [
    {"username": "dr.rao", "role": UserRole.DOCTOR.value, "full_name": "Dr. Ramesh Rao (Doctor)"},
    {"username": "nurse.geeta", "role": UserRole.NURSE.value, "full_name": "Geeta Sharma (Nurse)"},
    {
        "username": "pharm.imran",
        "role": UserRole.PHARMACIST.value,
        "full_name": "Imran Khan (Pharmacist)",
    },
    {
        "username": "lab.divya",
        "role": UserRole.LAB_TECH.value,
        "full_name": "Divya Nair (Lab Technician)",
    },
    {
        "username": "billing.sunil",
        "role": UserRole.BILLING.value,
        "full_name": "Sunil Verma (Billing Specialist)",
    },
    {
        "username": "admin.neha",
        "role": UserRole.ADMIN.value,
        "full_name": "Neha Sharma (System Administrator)",
    },
    {"username": "ramesh", "role": UserRole.PATIENT.value, "full_name": "Ramesh Kumar (Patient)"},
]


def seed_users(session: Session) -> None:
    """Idempotently seed the seven required users from spec section 3."""
    hashed_pwd = get_password_hash(SEED_PASSWORD)

    for u_data in SEED_USERS:
        statement = select(User).where(User.username == u_data["username"])
        existing = session.exec(statement).first()
        if existing:
            existing.role = u_data["role"]
            existing.full_name = u_data["full_name"]
            existing.hashed_password = hashed_pwd
            session.add(existing)
        else:
            new_user = User(
                username=u_data["username"],
                hashed_password=hashed_pwd,
                role=u_data["role"],
                full_name=u_data["full_name"],
            )
            session.add(new_user)
    session.commit()


def run_seed() -> None:
    """Run full seed process: create tables, seed users, generate source datasets, save mappings."""
    print("CareLens Seed: Initializing database tables...")
    create_db_and_tables()

    with Session(engine) as session:
        print("CareLens Seed: Seeding 7 users with Argon2 hashes...")
        seed_users(session)

    print("CareLens Seed: Generating Section 8 source datasets (EHR, Lab, Pharmacy, Claims)...")
    generate_all_datasets()

    print("CareLens Seed: Serializing Section 9 normalization mappings...")
    save_mappings_json()

    print("CareLens Seed: Completed successfully.")


if __name__ == "__main__":
    run_seed()
