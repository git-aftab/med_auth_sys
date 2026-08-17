from fastapi import FastAPI

from app.database.base import Base
from app.database.db import engine

from app.models.patient import Patient
from app.models.medication import Medication
from app.models.prescription import Prescription

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Medication Authentication System")


@app.get("/")
def hello_world():
    return {"message": "Medication Authentication Backend is running"}

@app.get("/health")
def healthceck():
    return "Server is running fine"