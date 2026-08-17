from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

class Prescription(Base):
    __tablename__ = "prescriptions" 

    id: Mapped[int] = mapped_column(primary_key=True)

    patient_id: Mapped[int] = mapped_column(
        ForeignKey("patients.id")   
    )

    medication_id: Mapped[int] = mapped_column(
        ForeignKey("medications.id")
    )

    dosage: Mapped[str] = mapped_column(String(100))
    frequency: Mapped[str] = mapped_column(String(100))

    active: Mapped[bool] = mapped_column(Boolean, default=True)

    patient = relationship(
        "Patient",
        back_populates="prescriptions"
    )

    medication = relationship(
        "Medication",
        back_populates="prescriptions"
    )