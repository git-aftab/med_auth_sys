"""
app/routes/rfid.py
==================
RFID Gate Endpoint — called by ESP32-S3 when a card is tapped.

POST /api/rfid/scan
  Body:     {"uid": "AA:BB:CC:DD"}
  Returns:  {"verified": true, "patient_name": "John Doe"}
            {"verified": false, "reason": "UNKNOWN_RFID"}
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.db import SessionLocal
from app.models.patient import Patient

router = APIRouter(prefix="/api/rfid", tags=["RFID Gate"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class RFIDScanRequest(BaseModel):
    uid: str


class RFIDScanResponse(BaseModel):
    verified: bool
    patient_name: str | None = None
    reason: str | None = None


@router.post("/scan", response_model=RFIDScanResponse)
def rfid_scan(request: RFIDScanRequest, db: Session = Depends(get_db)):
    """
    Called by ESP32-S3 when patient taps their RFID card.
    Returns verified=True if the UID maps to a known patient.
    """
    patient = db.query(Patient).filter(Patient.rfid_uid == request.uid).first()

    if not patient:
        return RFIDScanResponse(
            verified=False,
            reason="UNKNOWN_RFID"
        )

    return RFIDScanResponse(
        verified=True,
        patient_name=patient.name
    )
