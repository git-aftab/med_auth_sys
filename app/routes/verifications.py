from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.db import SessionLocal
from app.models.verification import Verification
from app.schemas.verification import VerificationRequest, VerificationResponse
from app.services.verification_service import process_verification

router = APIRouter(prefix="/api/verifications", tags=["Verifications"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("", response_model=VerificationResponse, status_code=status.HTTP_200_OK)
async def submit_verification(
    request: VerificationRequest, db: Session = Depends(get_db)
):
    """
    Primary Checkpoint API endpoint invoked by Edge Controller / ESP32.
    Evaluates Patient RFID, Active Prescription, Medication Visual Identity,
    and Gravimetric Weight Tolerances.
    """
    response = await process_verification(request, db)
    return response


@router.get("", response_model=List[VerificationResponse])
def get_verification_history(
    limit: int = 50, db: Session = Depends(get_db)
):
    """
    Retrieve audit trail history for Nurse Dashboard monitoring.
    """
    records = (
        db.query(Verification)
        .order_by(Verification.timestamp.desc())
        .limit(limit)
        .all()
    )

    response_list = []
    for r in records:
        failure_reasons = [r.failure_code] if r.failure_code else []
        patient_name = r.patient.name if r.patient else None
        prescribed_med = (
            f"{r.medication.name} {r.medication.strength}" if r.medication else None
        )

        response_list.append(
            VerificationResponse(
                id=r.id,
                status=r.status,
                patient_rfid=r.patient_rfid,
                patient_name=patient_name,
                prescribed_medication=prescribed_med,
                checks={
                    "patient_auth_passed": r.patient_auth_passed,
                    "identity_check_passed": r.identity_check_passed,
                    "appearance_check_passed": r.appearance_check_passed,
                    "weight_check_passed": r.weight_check_passed,
                },
                failure_reasons=failure_reasons,
                measured_weight_g=r.measured_weight_g,
                expected_weight_g=r.expected_weight_g,
                weight_delta_g=r.weight_delta_g,
                timestamp=r.timestamp,
            )
        )

    return response_list
