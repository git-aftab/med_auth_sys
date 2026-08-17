from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


class Verification(Base):
    __tablename__ = "verifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    patient_rfid: Mapped[str] = mapped_column(String(100), index=True)
    
    patient_id: Mapped[Optional[int]] = mapped_column(ForeignKey("patients.id"), nullable=True)
    prescription_id: Mapped[Optional[int]] = mapped_column(ForeignKey("prescriptions.id"), nullable=True)
    medication_id: Mapped[Optional[int]] = mapped_column(ForeignKey("medications.id"), nullable=True)

    status: Mapped[str] = mapped_column(String(50))  # VERIFIED or REJECTED
    
    patient_auth_passed: Mapped[bool] = mapped_column(Boolean, default=False)
    identity_check_passed: Mapped[bool] = mapped_column(Boolean, default=False)
    appearance_check_passed: Mapped[bool] = mapped_column(Boolean, default=False)
    weight_check_passed: Mapped[bool] = mapped_column(Boolean, default=False)

    measured_weight_g: Mapped[float] = mapped_column(Float, default=0.0)
    expected_weight_g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    weight_delta_g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    measured_color: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    measured_shape: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    measured_size_mm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    failure_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient")
    prescription = relationship("Prescription")
    medication = relationship("Medication")