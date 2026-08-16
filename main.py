from fastapi import FastAPI
from app.database.base import Base
from app.database.db import engine

from app.models.patient import Patient

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Medication Authentication System")


@app.get("/")
def hello_world():
    return {"message": "Medication Authentication Backend is running"}