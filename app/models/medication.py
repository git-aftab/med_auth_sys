from sqlalchemy import Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base

class Medication(Base):
    __tablename__ = "medications"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    strength: Mapped[str] = mapped_column(String(50))

    color: Mapped[str] = mapped_column(String(50))
    shape: Mapped[str] = mapped_column(String(50))
    size_mm: Mapped[float] = mapped_column(Float)

    reference_weight_g: Mapped[float] = mapped_column(Float)
    weight_tolerence_g: Mapped[float] = mapped_column(Float)