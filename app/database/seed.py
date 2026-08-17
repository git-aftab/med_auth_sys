import os
from sqlalchemy.orm import Session

from app.database.base import Base
from app.database.db import engine, SessionLocal
from app.models.patient import Patient
from app.models.medication import Medication
from app.models.prescription import Prescription


def seed_database():
    print("Dropping existing database tables...")
    Base.metadata.drop_all(bind=engine)

    print("Creating new database tables...")
    Base.metadata.create_all(bind=engine)

    db: Session = SessionLocal()

    try:
        print("Seeding Patients...")
        patient1 = Patient(name="John Doe", rfid_uid="RFID_PATIENT_001")
        patient2 = Patient(name="Jane Smith", rfid_uid="RFID_PATIENT_002")
        patient3 = Patient(name="Alice Johnson", rfid_uid="RFID_PATIENT_003")

        db.add_all([patient1, patient2, patient3])
        db.commit()

        print("Seeding Medications...")
        med1 = Medication(
            name="Paracetamol",
            strength="500mg",
            color="white",
            shape="oval",
            size_mm=12.5,
            reference_weight_g=0.50,
            weight_tolerance_g=0.05,
            epillid_class_id="51285-0092-87_BE305F72"
        )
        med2 = Medication(
            name="Amoxicillin",
            strength="250mg",
            color="yellow",
            shape="capsule",
            size_mm=14.0,
            reference_weight_g=0.35,
            weight_tolerance_g=0.03,
            epillid_class_id="00093-0148-01_4629A34D"
        )
        med3 = Medication(
            name="Ibuprofen",
            strength="400mg",
            color="red",
            shape="round",
            size_mm=10.0,
            reference_weight_g=0.40,
            weight_tolerance_g=0.04,
            epillid_class_id="00093-7248-06_7829BC3D"
        )
        med4 = Medication(
            name="Metformin",
            strength="850mg",
            color="white",
            shape="round",
            size_mm=11.0,
            reference_weight_g=0.85,
            weight_tolerance_g=0.05,
            epillid_class_id="00093-0054-01_1234ABCD"
        )
        med5 = Medication(
            name="Atorvastatin",
            strength="20mg",
            color="blue",
            shape="oval",
            size_mm=8.5,
            reference_weight_g=0.20,
            weight_tolerance_g=0.02,
            epillid_class_id="00093-0020-01_5678EFGH"
        )

        db.add_all([med1, med2, med3, med4, med5])
        db.commit()

        print("Seeding Prescriptions...")
        p1 = Prescription(
            patient_id=patient1.id,
            medication_id=med1.id,
            dosage="1 tablet",
            frequency="Every 8 hours",
            active=True
        )
        p2 = Prescription(
            patient_id=patient2.id,
            medication_id=med2.id,
            dosage="1 capsule",
            frequency="Every 12 hours",
            active=True
        )
        p3 = Prescription(
            patient_id=patient3.id,
            medication_id=med3.id,
            dosage="1 tablet",
            frequency="As needed",
            active=True
        )

        db.add_all([p1, p2, p3])
        db.commit()

        print("Database successfully seeded!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
