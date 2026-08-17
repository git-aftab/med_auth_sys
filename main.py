from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.base import Base
from app.database.db import engine
import app.models  # Ensures all ORM models are registered

from app.routes import patients, medications, verifications, ws, rfid, camera

# Initialize database tables on startup if not already created
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Multi-Factor Patient & Medication Authentication System",
    version="1.0.0",
    description="Backend API and Real-Time Nurse Dashboard WebSocket Service",
)

# Enable CORS for Nurse Dashboard & Edge Devices
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(rfid.router)
app.include_router(camera.router)
app.include_router(patients.router)
app.include_router(medications.router)
app.include_router(verifications.router)
app.include_router(ws.router)


@app.get("/")
def root():
    return {"message": "Multi-Factor Patient & Medication Authentication System API is running"}


@app.get("/health")
def healthcheck():
    return {"status": "healthy", "service": "Patient_MEDS_Sys"}