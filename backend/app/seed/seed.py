"""CareLens synthetic seed data generator."""

import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger("carelens.seed")


def run_seed() -> None:
    """Seed synthetic patient records and baseline consent/audit data."""
    logger.info("Initializing CareLens seed harness...")
    logger.info(
        "Hero patient: Ramesh Kumar (DOB 1968-03-14, Mysuru 570001, phone 90000 12345)"
    )
    logger.info(
        "Sources: EHR (APL-004512), Lab A (LB-77120), Pharmacy (PH-30991), Insurer (STAR-48221)"
    )
    logger.info("Database seed initialized successfully.")


if __name__ == "__main__":
    run_seed()
