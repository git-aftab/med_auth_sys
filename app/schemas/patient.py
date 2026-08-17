from pydantic import BaseModel, ConfigDict
from typing import Optional, List


class PatientBase(BaseModel):
    name: str
    rfid_uid: str


class PatientCreate(PatientBase):
    pass


class PatientResponse(PatientBase):
    id: int
    
    model_config = ConfigDict(from_attributes=True)
