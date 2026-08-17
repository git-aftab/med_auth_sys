from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.db import SessionLocal
from app.models.medication import Medication
from app.schemas.medication import MedicationResponse

router = APIRouter(prefix="/api/medications", tags=["Medications"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("", response_model=List[MedicationResponse])
def get_all_medications(db: Session = Depends(get_db)):
    medications = db.query(Medication).all()
    return medications


@router.get("/{medication_id}", response_model=MedicationResponse)
def get_medication_by_id(medication_id: int, db: Session = Depends(get_db)):
    medication = db.query(Medication).filter(Medication.id == medication_id).first()
    if not medication:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Medication with ID '{medication_id}' not found"
        )
    return medication
