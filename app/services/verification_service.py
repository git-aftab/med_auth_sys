from typing import Tuple, List, Optional
from sqlalchemy.orm import Session
import math

from app.models.patient import Patient
from app.models.prescription import Prescription
from app.models.medication import Medication
from app.models.verification import Verification
from app.schemas.verification import (
    VerificationRequest,
    VerificationResponse,
    VerificationFactorBreakdown,
)
from app.websocket.manager import ws_manager


async def process_verification(
    request: VerificationRequest, db: Session
) -> VerificationResponse:
    """
    Core Verification Engine Logic:
    1. Patient RFID Authentication (Gate)
    2. Active Prescription Retrieval
    3. Medication Identity Verification
    4. Visual Appearance Check (Color/Shape/Size)
    5. Gravimetric Weight Check (Load cell tolerance)
    6. Audit trail persistence & WebSocket broadcast to Nurse Dashboard
    """
    failure_reasons: List[str] = []
    
    patient_auth_passed = False
    identity_check_passed = False
    appearance_check_passed = False
    weight_check_passed = False

    expected_weight: Optional[float] = None
    weight_delta: Optional[float] = None

    # Step 1: Patient Authentication Gate
    patient = db.query(Patient).filter(Patient.rfid_uid == request.patient_rfid).first()
    
    if not patient:
        failure_reasons.append("PATIENT_NOT_AUTHENTICATED")
        verification_record = Verification(
            patient_rfid=request.patient_rfid,
            status="REJECTED",
            patient_auth_passed=False,
            identity_check_passed=False,
            appearance_check_passed=False,
            weight_check_passed=False,
            measured_weight_g=request.measured_weight_g,
            measured_color=request.measured_color,
            measured_shape=request.measured_shape,
            measured_size_mm=request.measured_size_mm,
            failure_code="PATIENT_NOT_AUTHENTICATED",
        )
        db.add(verification_record)
        db.commit()
        db.refresh(verification_record)

        response = VerificationResponse(
            id=verification_record.id,
            status="REJECTED",
            patient_rfid=request.patient_rfid,
            patient_name=None,
            prescribed_medication=None,
            checks=VerificationFactorBreakdown(
                patient_auth_passed=False,
                identity_check_passed=False,
                appearance_check_passed=False,
                weight_check_passed=False,
            ),
            failure_reasons=failure_reasons,
            measured_weight_g=request.measured_weight_g,
            expected_weight_g=None,
            weight_delta_g=None,
            timestamp=verification_record.timestamp,
        )

        await ws_manager.broadcast(response.model_dump())
        return response

    # Patient RFID found
    patient_auth_passed = True

    # Step 2: Active Prescription Check
    prescription = (
        db.query(Prescription)
        .filter(Prescription.patient_id == patient.id, Prescription.active == True)
        .first()
    )

    if not prescription or not prescription.medication:
        failure_reasons.append("NO_ACTIVE_PRESCRIPTION")
        verification_record = Verification(
            patient_rfid=request.patient_rfid,
            patient_id=patient.id,
            status="REJECTED",
            patient_auth_passed=True,
            identity_check_passed=False,
            appearance_check_passed=False,
            weight_check_passed=False,
            measured_weight_g=request.measured_weight_g,
            measured_color=request.measured_color,
            measured_shape=request.measured_shape,
            measured_size_mm=request.measured_size_mm,
            failure_code="NO_ACTIVE_PRESCRIPTION",
        )
        db.add(verification_record)
        db.commit()
        db.refresh(verification_record)

        response = VerificationResponse(
            id=verification_record.id,
            status="REJECTED",
            patient_rfid=request.patient_rfid,
            patient_name=patient.name,
            prescribed_medication=None,
            checks=VerificationFactorBreakdown(
                patient_auth_passed=True,
                identity_check_passed=False,
                appearance_check_passed=False,
                weight_check_passed=False,
            ),
            failure_reasons=failure_reasons,
            measured_weight_g=request.measured_weight_g,
            expected_weight_g=None,
            weight_delta_g=None,
            timestamp=verification_record.timestamp,
        )

        await ws_manager.broadcast(response.model_dump())
        return response

    medication = prescription.medication
    expected_weight = medication.reference_weight_g
    weight_delta = round(abs(request.measured_weight_g - expected_weight), 4)

    # Step 3: Medication Identity Check
    identity_check_passed = True
    if request.epillid_class_id:
        if medication.epillid_class_id and request.epillid_class_id != medication.epillid_class_id:
            identity_check_passed = False
            failure_reasons.append("MEDICATION_MISMATCH")

    # Step 4: Visual Appearance Check (Color / Shape)
    appearance_check_passed = True
    if request.measured_color and request.measured_color.lower() != medication.color.lower():
        appearance_check_passed = False
        if "APPEARANCE_MISMATCH" not in failure_reasons:
            failure_reasons.append("APPEARANCE_MISMATCH")

    if request.measured_shape and request.measured_shape.lower() != medication.shape.lower():
        appearance_check_passed = False
        if "APPEARANCE_MISMATCH" not in failure_reasons:
            failure_reasons.append("APPEARANCE_MISMATCH")

    # Step 5: Gravimetric Weight Check
    if weight_delta <= medication.weight_tolerance_g:
        weight_check_passed = True
    else:
        weight_check_passed = False
        failure_reasons.append("WEIGHT_MISMATCH")

    # Overall Status Decision
    overall_passed = (
        patient_auth_passed
        and identity_check_passed
        and appearance_check_passed
        and weight_check_passed
    )

    status = "VERIFIED" if overall_passed else "REJECTED"
    primary_failure_code = failure_reasons[0] if failure_reasons else None

    # Step 6: Persist Audit Record
    verification_record = Verification(
        patient_rfid=request.patient_rfid,
        patient_id=patient.id,
        prescription_id=prescription.id,
        medication_id=medication.id,
        status=status,
        patient_auth_passed=patient_auth_passed,
        identity_check_passed=identity_check_passed,
        appearance_check_passed=appearance_check_passed,
        weight_check_passed=weight_check_passed,
        measured_weight_g=request.measured_weight_g,
        expected_weight_g=expected_weight,
        weight_delta_g=weight_delta,
        measured_color=request.measured_color,
        measured_shape=request.measured_shape,
        measured_size_mm=request.measured_size_mm,
        failure_code=primary_failure_code,
    )
    db.add(verification_record)
    db.commit()
    db.refresh(verification_record)

    response = VerificationResponse(
        id=verification_record.id,
        status=status,
        patient_rfid=request.patient_rfid,
        patient_name=patient.name,
        prescribed_medication=f"{medication.name} {medication.strength}",
        checks=VerificationFactorBreakdown(
            patient_auth_passed=patient_auth_passed,
            identity_check_passed=identity_check_passed,
            appearance_check_passed=appearance_check_passed,
            weight_check_passed=weight_check_passed,
        ),
        failure_reasons=failure_reasons,
        measured_weight_g=request.measured_weight_g,
        expected_weight_g=expected_weight,
        weight_delta_g=weight_delta,
        timestamp=verification_record.timestamp,
    )

    # Step 7: Broadcast to WebSocket Dashboard
    await ws_manager.broadcast(response.model_dump())
    return response
