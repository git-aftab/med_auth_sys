from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base

class Patient(Base):
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String[100])
    rfid_uid: Mapped[str]= mapped_column(
        String(100),
        unique=True,
        index=True
    )

    prescriptions = relationship(
        "prescription",
        back_populates="patient"
    )