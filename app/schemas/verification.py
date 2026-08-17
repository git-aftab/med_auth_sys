from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class VerificationRequest(BaseModel):
    patient_rfid: str
    measured_weight_g: float
    image_base64: Optional[str] = None
    epillid_class_id: Optional[str] = None
    measured_color: Optional[str] = None
    measured_shape: Optional[str] = None
    measured_size_mm: Optional[float] = None


class VerificationFactorBreakdown(BaseModel):
    patient_auth_passed: bool
    identity_check_passed: bool
    appearance_check_passed: bool
    weight_check_passed: bool


class VerificationResponse(BaseModel):
    id: int
    status: str
    patient_rfid: str
    patient_name: Optional[str] = None
    prescribed_medication: Optional[str] = None
    checks: VerificationFactorBreakdown
    failure_reasons: List[str]
    measured_weight_g: float
    expected_weight_g: Optional[float] = None
    weight_delta_g: Optional[float] = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)
