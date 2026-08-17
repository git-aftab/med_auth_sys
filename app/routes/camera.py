"""
app/routes/camera.py
====================
Camera Trigger Endpoints — the bridge between ESP32-S3 button and ESP32-CAM.

Flow:
  ESP32-S3 presses button
    → POST /api/camera/trigger  {"rfid": "AA:BB:CC:DD"}

  serial_bridge.py polls
    → GET /api/camera/pending   ← returns pending trigger if one exists

  serial_bridge.py picks it up, sends 'C' to ESP32-CAM,
  reads JPEG, then calls POST /api/verifications directly

  → DELETE /api/camera/pending  ← bridge clears trigger after consuming it

The pending trigger is stored in memory (dict).
One pending slot is sufficient for a single-nurse single-station setup.
"""

import time
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/camera", tags=["Camera Trigger"])


# =====================================================
# IN-MEMORY TRIGGER SLOT
# =====================================================

_pending_trigger: Optional[dict] = None
TRIGGER_TTL_SECONDS = 30  # auto-expire if bridge doesn't pick it up


# =====================================================
# SCHEMAS
# =====================================================

class CameraTriggerRequest(BaseModel):
    rfid: str
    measured_weight_g: float = 0.0   # weight from load cell if wired to S3; else 0


class PendingTriggerResponse(BaseModel):
    pending: bool
    rfid: Optional[str] = None
    measured_weight_g: Optional[float] = None


# =====================================================
# ROUTES
# =====================================================

@router.post("/trigger")
def trigger_camera(request: CameraTriggerRequest):
    """
    Called by ESP32-S3 when the physical scan button is pressed.
    Stores trigger so serial_bridge.py can pick it up.
    """
    global _pending_trigger

    _pending_trigger = {
        "pending":           True,
        "rfid":              request.rfid,
        "measured_weight_g": request.measured_weight_g,
        "queued_at":         time.time(),
    }

    print(f"[camera] Trigger queued for RFID {request.rfid} — awaiting bridge pickup")
    return {"status": "triggered", "rfid": request.rfid}


@router.get("/pending", response_model=PendingTriggerResponse)
def get_pending_trigger():
    """
    Polled by serial_bridge.py every 500ms.
    Returns the pending trigger if one exists and hasn't expired.
    """
    global _pending_trigger

    if not _pending_trigger:
        return PendingTriggerResponse(pending=False)

    # Auto-expire stale triggers
    age = time.time() - _pending_trigger.get("queued_at", 0)
    if age > TRIGGER_TTL_SECONDS:
        _pending_trigger = None
        return PendingTriggerResponse(pending=False)

    return PendingTriggerResponse(
        pending=True,
        rfid=_pending_trigger["rfid"],
        measured_weight_g=_pending_trigger["measured_weight_g"],
    )


@router.delete("/pending")
def clear_pending_trigger():
    """
    Called by serial_bridge.py after picking up the trigger.
    """
    global _pending_trigger
    _pending_trigger = None
    return {"status": "cleared"}
