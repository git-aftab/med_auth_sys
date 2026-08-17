from pydantic import BaseModel, ConfigDict
from typing import Optional


class MedicationBase(BaseModel):
    name: str
    strength: str
    epillid_class_id: Optional[str] = None
    color: str
    shape: str
    size_mm: float
    reference_weight_g: float
    weight_tolerance_g: float


class MedicationCreate(MedicationBase):
    pass


class MedicationResponse(MedicationBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
