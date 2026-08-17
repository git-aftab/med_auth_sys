from pydantic import BaseModel, ConfigDict
from app.schemas.medication import MedicationResponse


class PrescriptionBase(BaseModel):
    patient_id: int
    medication_id: int
    dosage: str
    frequency: str
    active: bool = True


class PrescriptionCreate(PrescriptionBase):
    pass


class PrescriptionResponse(PrescriptionBase):
    id: int
    medication: MedicationResponse

    model_config = ConfigDict(from_attributes=True)
