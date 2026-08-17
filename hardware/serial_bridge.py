"""
serial_bridge.py
================
PC-side bridge between ESP32-CAM (serial) and FastAPI backend (HTTP).

How it works:
  1. Connects to the ESP32-CAM USB serial port
  2. Polls the FastAPI backend for a pending camera trigger
     (GET /api/camera/pending)
  3. When a trigger is pending, sends 'C' to the ESP32-CAM
  4. Reads the JPEG frame from serial (AIRAIMG protocol)
  5. POSTs the image as base64 + measured weight to /api/verifications

Run:
  python serial_bridge.py

Requirements:
  pip install pyserial requests

Env variables (or edit CONFIG section below):
  SERIAL_PORT  - e.g. /dev/ttyUSB0 or COM3
  BACKEND_URL  - e.g. http://127.0.0.1:8000
"""

import os
import sys
import time
import base64
import struct
import threading
import requests
import serial


# =====================================================
# CONFIG — edit or set as environment variables
# =====================================================

SERIAL_PORT  = os.getenv("SERIAL_PORT",  "/dev/ttyUSB0")   # or COM3 on Windows
BAUD_RATE    = 460800                                        # must match ESP32-CAM firmware
BACKEND_URL  = os.getenv("BACKEND_URL",  "http://127.0.0.1:8000")

POLL_INTERVAL_S = 0.5    # how often to poll backend for pending trigger
READ_TIMEOUT_S  = 10.0   # max seconds to wait for JPEG frame from ESP32-CAM

# Binary frame constants (must match firmware)
MAGIC_HEADER = b"AIRAIMG"  # 7 bytes


# =====================================================
# SERIAL FRAME READER
# Protocol:
#   [7 bytes]  magic "AIRAIMG"
#   [4 bytes]  JPEG length (uint32 little-endian)
#   [N bytes]  raw JPEG bytes
# =====================================================

def read_exact(ser: serial.Serial, n: int, timeout: float = READ_TIMEOUT_S) -> bytes:
    """Read exactly n bytes from serial, with timeout."""
    buf = b""
    deadline = time.time() + timeout
    while len(buf) < n:
        if time.time() > deadline:
            raise TimeoutError(f"Serial read timed out waiting for {n - len(buf)} more bytes")
        chunk = ser.read(n - len(buf))
        if chunk:
            buf += chunk
    return buf


def wait_for_magic(ser: serial.Serial, timeout: float = READ_TIMEOUT_S) -> bool:
    """Scan the serial stream until the AIRAIMG magic header is found."""
    deadline = time.time() + timeout
    window   = b""

    while time.time() < deadline:
        byte = ser.read(1)
        if not byte:
            continue
        window = (window + byte)[-len(MAGIC_HEADER):]
        if window == MAGIC_HEADER:
            return True

    return False


def read_jpeg_frame(ser: serial.Serial) -> bytes | None:
    """
    Wait for and parse one AIRAIMG binary frame from serial.
    Returns raw JPEG bytes, or None on failure.
    """
    print("[bridge] Waiting for AIRAIMG frame...")

    if not wait_for_magic(ser):
        print("[bridge] ERROR: Magic header not found (timeout)")
        return None

    # Read uint32 length (4 bytes LE)
    length_bytes = read_exact(ser, 4)
    jpeg_length  = struct.unpack("<I", length_bytes)[0]

    if jpeg_length == 0:
        print("[bridge] ERROR: ESP32-CAM reported capture failure (length=0)")
        return None

    print(f"[bridge] JPEG frame: {jpeg_length} bytes — reading...")

    # Read JPEG payload
    jpeg_data = read_exact(ser, jpeg_length)
    print(f"[bridge] Frame received OK ({jpeg_length} bytes)")
    return jpeg_data


# =====================================================
# BACKEND COMMUNICATION
# =====================================================

def poll_for_trigger() -> dict | None:
    """
    GET /api/camera/pending
    Returns the pending trigger dict {"rfid": "...", "weight_g": ...}
    or None if nothing is pending.
    """
    try:
        r = requests.get(f"{BACKEND_URL}/api/camera/pending", timeout=2)
        if r.status_code == 200:
            data = r.json()
            if data.get("pending"):
                return data
    except requests.exceptions.ConnectionError:
        print("[bridge] WARNING: Cannot reach backend — retrying...")
    except Exception as e:
        print(f"[bridge] Poll error: {e}")
    return None


def clear_trigger():
    """DELETE /api/camera/pending — mark trigger as consumed."""
    try:
        requests.delete(f"{BACKEND_URL}/api/camera/pending", timeout=2)
    except Exception:
        pass


def post_verification(rfid: str, jpeg_bytes: bytes, weight_g: float) -> dict | None:
    """
    POST /api/verifications
    Submits the captured pill image + weight for full 4-factor verification.
    """
    image_b64 = base64.b64encode(jpeg_bytes).decode("utf-8")

    payload = {
        "patient_rfid":     rfid,
        "measured_weight_g": weight_g,
        "image_base64":     image_b64,
    }

    try:
        r = requests.post(
            f"{BACKEND_URL}/api/verifications",
            json=payload,
            timeout=15
        )
        if r.status_code == 200:
            result = r.json()
            print(f"[bridge] Verification result: {result['status']}")
            if result.get("failure_reasons"):
                print(f"[bridge] Failures: {result['failure_reasons']}")
            return result
        else:
            print(f"[bridge] Verification HTTP error: {r.status_code}")
            print(f"[bridge] {r.text}")
    except Exception as e:
        print(f"[bridge] Post error: {e}")
    return None


# =====================================================
# MAIN LOOP
# =====================================================

def run():
    print("====================================")
    print("   AIRA Serial Bridge v2.0")
    print("====================================")
    print(f"[bridge] Serial port : {SERIAL_PORT} @ {BAUD_RATE}")
    print(f"[bridge] Backend     : {BACKEND_URL}")
    print()

    try:
        ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
    except serial.SerialException as e:
        print(f"[bridge] FATAL: Cannot open serial port: {e}")
        print(f"  Hint: Check SERIAL_PORT env var (currently: {SERIAL_PORT})")
        print(f"  Linux: /dev/ttyUSB0  Windows: COM3  Mac: /dev/cu.usbserial-*")
        sys.exit(1)

    print(f"[bridge] Connected to {SERIAL_PORT}")
    time.sleep(2)  # give ESP32 time to boot if just powered

    print("[bridge] Polling backend for camera triggers...")
    print("[bridge] Press Ctrl+C to exit")
    print()

    try:
        while True:
            # Check if backend has a pending camera trigger
            trigger = poll_for_trigger()

            if trigger:
                rfid     = trigger.get("rfid", "")
                weight_g = trigger.get("measured_weight_g", 0.0)

                print(f"\n[bridge] === TRIGGER RECEIVED ===")
                print(f"[bridge] Patient RFID : {rfid}")
                print(f"[bridge] Weight       : {weight_g}g")

                # Consume the trigger on backend first
                clear_trigger()

                # Flush any stale serial data
                ser.reset_input_buffer()

                # Send 'C' command to ESP32-CAM
                ser.write(b'C')
                ser.flush()
                print("[bridge] Sent capture command to ESP32-CAM")

                # Read the JPEG frame
                jpeg_bytes = read_jpeg_frame(ser)

                if jpeg_bytes:
                    # Forward to backend for verification
                    post_verification(rfid, jpeg_bytes, weight_g)
                else:
                    print("[bridge] No image captured — skipping verification")

                print("[bridge] ========================\n")

            time.sleep(POLL_INTERVAL_S)

    except KeyboardInterrupt:
        print("\n[bridge] Stopped by user")
    finally:
        ser.close()
        print("[bridge] Serial port closed")


if __name__ == "__main__":
    run()
