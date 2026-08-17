from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.db import SessionLocal
from app.models.patient import Patient
from app.models.prescription import Prescription
from app.schemas.patient import PatientResponse
from app.schemas.prescription import PrescriptionResponse

router = APIRouter(prefix="/api/patients", tags=["Patients"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("", response_model=List[PatientResponse])
def get_all_patients(db: Session = Depends(get_db)):
    patients = db.query(Patient).all()
    return patients


@router.get("/{rfid_uid}", response_model=PatientResponse)
def get_patient_by_rfid(rfid_uid: str, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.rfid_uid == rfid_uid).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with RFID '{rfid_uid}' not found"
        )
    return patient


@router.get("/{rfid_uid}/prescription", response_model=PrescriptionResponse)
def get_patient_active_prescription(rfid_uid: str, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.rfid_uid == rfid_uid).first()
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with RFID '{rfid_uid}' not found"
        )

    prescription = (
        db.query(Prescription)
        .filter(Prescription.patient_id == patient.id, Prescription.active == True)
        .first()
    )

    if not prescription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No active prescription found for patient '{patient.name}'"
        )

    return prescription
