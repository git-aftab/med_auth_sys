# PRD — Multi-Factor Patient & Medication Authentication System Backend

## 1. Document Purpose

This document defines the backend requirements for the hackathon prototype of the **Multi-Factor Patient and Medication Authentication System**.

The backend is responsible for:
- Patient authentication and prescription retrieval
- Medication reference-profile management
- Multi-factor medication verification
- Verification history and audit records
- Communication with the ESP32-class device
- Real-time status updates to the nurse dashboard
- Integration with the computer-vision subsystem

The backend will be implemented using **Python, FastAPI, SQLAlchemy ORM, SQLite, Pydantic, and OpenCV integration**.

---

## 2. Problem Statement

Medication administration errors can occur because of:
- Incorrect patient identification
- Wrong medication
- Similar-looking tablets
- Incorrect dosage or quantity
- Human error during busy/night/emergency situations

The system must therefore avoid trusting a single indicator.

A medication can be declared **VERIFIED only when all required checks pass simultaneously**:
1. Patient identity is authenticated.
2. Medication identity matches the patient's active prescription.
3. Visual characteristics match the stored medication profile.
4. Measured tablet weight falls within the stored tolerance range.

Any failed check must produce a specific failure reason.

---

## 3. Primary User

### Nurse / Healthcare Worker

The system is primarily designed to assist the nurse during medication administration.

The patient mainly participates by providing identity through:
- RFID card/wristband, or
- QR code.

The nurse:
- Identifies the patient.
- Places the medication on the verification station.
- Receives local feedback from the device.
- Views the real-time result on the nurse dashboard.
- Can review complete verification history.

An administrative medication-registration workflow may also be used by a nurse/admin during prototype setup.

---

## 4. System Scope

### In Scope

- RFID/QR patient authentication
- Patient and prescription lookup
- Medication master/reference profiles
- Visual verification data
- Gravimetric verification data
- Automatic tare workflow support
- Tolerance-based weight comparison
- Multi-factor verification engine
- Specific failure reasons
- Verification history
- ESP32 HTTP communication
- Real-time dashboard updates
- OpenCV integration for visual feature extraction
- SQLite persistence
- Basic API validation and error handling

### Out of Scope for the Prototype

- Real pharmaceutical database integration
- Chemical/drug-content verification
- Guaranteeing active ingredient concentration from tablet weight
- Production-grade hospital authentication/authorization
- Integration with hospital EMR/EHR systems
- Medical decision making
- Automated dispensing of medication
- Full pharmaceutical regulatory compliance

---

## 5. High-Level Architecture

```text
                     ┌──────────────────┐
                     │     PATIENT      │
                     │   RFID / QR      │
                     └────────┬─────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │      ESP32       │
                     │ Device Controller│
                     └────────┬─────────┘
                              │
                 ┌────────────┼────────────┐
                 │            │            │
                 ▼            ▼            ▼
               RFID        Load Cell    ESP32-CAM
                              │            │
                              │            ▼
                              │          OpenCV
                              │            │
                              │   Color/Shape/Size
                              │            │
                 └────────────┼────────────┘
                              ▼
                     ┌──────────────────┐
                     │     FastAPI      │
                     │     Backend      │
                     └────────┬─────────┘
                              │
             ┌────────────────┼────────────────┐
             │                │                │
             ▼                ▼                ▼
        Verification      SQLAlchemy       WebSocket
           Engine             ORM              │
             │                │                │
             ▼                ▼                ▼
       PASS / REJECT       SQLite       Nurse Dashboard
                              │
                              ▼
                     Verification History
```

---

## 6. Core Principle: Patient Authentication is a Gate

The verification sequence MUST enforce:

```text
RFID / QR
   ↓
Authenticate patient
   ↓
Valid patient?
   ├── NO  → STOP
   └── YES
         ↓
     Fetch prescription
         ↓
     Enable medication verification
```

No medication verification should be accepted if the patient has not been successfully authenticated.

---

## 7. Medication Reference Profile vs Prescription

The system must keep these concepts separate.

### Prescription

Defines **what the patient should receive**.

Example:

```text
Patient: P001
Medication: Paracetamol
Strength: 500 mg
Dose: 1 tablet
Frequency: 2/day
```

### Medication Reference Profile

Defines **what the physical medication should look like**.

Example:

```text
Medication: Paracetamol 500 mg

Colour: White
Shape: Round
Approximate size: 10 mm
Reference tablet weight: 0.500 g
Weight tolerance: ±0.050 g
```

The prescription normally does not contain physical tablet weight, colour, or dimensions.

For the prototype, medication reference profiles will be created through a controlled registration/calibration workflow.

---

## 8. Automatic Tare Requirement

Before every medication weight measurement:

1. Verification station must be empty.
2. Load-cell reading must stabilize.
3. Current empty-platform reading is treated as zero.
4. Nurse places the medication.
5. System waits for a stable reading.
6. Stable measured weight is sent to the verification engine.

Conceptually:

```text
Empty platform
      ↓
Stable reading
      ↓
TARE → 0.000 g
      ↓
Place medication
      ↓
Stable reading
      ↓
Measured tablet weight
```

The tare operation must occur **before** the medication is placed.

---

## 9. Verification Factors

### 9.1 Patient Identity

Input:
- RFID UID or QR-derived patient identifier

Backend:
- Resolve patient
- Validate patient
- Retrieve active prescription

Result:
- PASS / FAIL

### 9.2 Medication Identity

The backend determines the expected medication from the authenticated patient's active prescription.

The system must ensure that the medication being verified corresponds to the prescribed medication profile.

### 9.3 Visual Check

The vision subsystem provides:

- Colour
- Shape
- Approximate dimensions/size

The backend compares measured values against the stored medication reference profile.

### 9.4 Weight Check

Input:
- Stable measured tablet weight

Comparison:

```text
lower_limit = reference_weight - tolerance
upper_limit = reference_weight + tolerance
```

PASS when:

```text
lower_limit <= measured_weight <= upper_limit
```

---

## 10. Final Verification Rule

The medication is verified only when all required checks pass:

```text
Patient authentication    ✓
Medication identity       ✓
Appearance                ✓
Weight                    ✓
--------------------------------
Final result              VERIFIED
```

If any check fails:

```text
Final result = REJECTED
```

The response must identify the failed factor(s).

Example:

```json
{
  "result": "REJECTED",
  "checks": {
    "patient": true,
    "identity": true,
    "appearance": true,
    "weight": false
  },
  "failure_reasons": [
    "WEIGHT_MISMATCH"
  ]
}
```

Multiple failures should be retained rather than hiding them behind the first error.

---

## 11. Verification Workflow

```text
START
  │
  ▼
Scan RFID / QR
  │
  ▼
Authenticate Patient
  │
  ├── FAIL → Stop + Local Error + Dashboard Event
  │
  ▼
Fetch Active Prescription
  │
  ▼
Prepare Verification Station
  │
  ▼
Automatic Tare
  │
  ▼
Place Medication
  │
  ├───────────────┬───────────────┐
  ▼               ▼               ▼
Camera          Load Cell       Prescription
  │               │               │
  ▼               ▼               ▼
Colour           Weight       Expected Profile
Shape
Size
  │               │               │
  └───────────────┴───────────────┘
                  ▼
          Verification Engine
                  │
          ┌───────┴────────┐
          ▼                ▼
       ALL PASS          ANY FAIL
          │                │
          ▼                ▼
      VERIFIED          REJECTED
          │                │
          └────────┬───────┘
                   ▼
          Save Verification
              History
                   │
          ┌────────┴────────┐
          ▼                 ▼
       ESP32            Nurse Dashboard
     LED/OLED/Buzzer      Real-time
```

---

## 12. Data Model

### Patient

| Field | Description |
|---|---|
| id | Internal patient ID |
| name | Patient name |
| rfid_uid | Registered RFID identifier |
| qr_code | Optional QR identifier |
| age | Patient age |
| diagnosis | Prototype patient information |

### Medication

| Field | Description |
|---|---|
| id | Medication ID |
| name | Medication name |
| strength | Active ingredient strength |
| colour | Expected colour |
| shape | Expected shape |
| size | Approximate dimensions |
| reference_weight | Reference physical tablet weight |
| weight_tolerance | Accepted weight deviation |

### Prescription

| Field | Description |
|---|---|
| id | Prescription ID |
| patient_id | Patient receiving medication |
| medication_id | Prescribed medication |
| dosage | Prescribed dose |
| frequency | Administration frequency |
| active | Whether prescription is currently active |

### Verification

| Field | Description |
|---|---|
| id | Verification ID |
| patient_id | Authenticated patient |
| prescription_id | Related prescription |
| medication_id | Expected medication |
| measured_colour | Camera result |
| measured_shape | Camera result |
| measured_size | Camera result |
| measured_weight | Load-cell result |
| patient_check | PASS/FAIL |
| identity_check | PASS/FAIL |
| appearance_check | PASS/FAIL |
| weight_check | PASS/FAIL |
| result | VERIFIED/REJECTED |
| failure_reasons | Specific mismatch reasons |
| created_at | Verification timestamp |

---

## 13. Core Backend API

Initial API design:

### Patients

```text
POST   /api/patients
GET    /api/patients/{patient_id}
GET    /api/patients/rfid/{rfid_uid}
```

### Medications

```text
POST   /api/medications
GET    /api/medications
GET    /api/medications/{medication_id}
PUT    /api/medications/{medication_id}
```

### Prescriptions

```text
POST   /api/prescriptions
GET    /api/patients/{patient_id}/prescriptions
GET    /api/prescriptions/{prescription_id}
```

### Verification

```text
POST   /api/verifications
GET    /api/verifications
GET    /api/verifications/{verification_id}
GET    /api/patients/{patient_id}/verifications
```

### Medication Registration / Calibration

```text
POST   /api/medications/{medication_id}/reference-profile
```

This endpoint may later accept reference measurements produced by the load-cell/camera subsystem.

---

## 14. Verification Request Contract

The ESP32/vision subsystem should eventually send data conceptually similar to:

```json
{
  "patient_rfid": "RFID-001",
  "visual": {
    "colour": "white",
    "shape": "round",
    "size_mm": 9.8
  },
  "weight_g": 0.498
}
```

The backend then:

1. Authenticates the patient.
2. Finds the active prescription.
3. Determines the expected medication.
4. Loads its reference profile.
5. Compares visual characteristics.
6. Compares weight with tolerance.
7. Determines final result.
8. Stores the complete verification record.
9. Returns the result to the device.
10. Publishes the result to the nurse dashboard.

---

## 15. Verification Response Contract

Successful example:

```json
{
  "verification_id": "VER-00001",
  "result": "VERIFIED",
  "checks": {
    "patient": true,
    "identity": true,
    "appearance": true,
    "weight": true
  },
  "message": "Medication verified successfully"
}
```

Failure example:

```json
{
  "verification_id": "VER-00002",
  "result": "REJECTED",
  "checks": {
    "patient": true,
    "identity": true,
    "appearance": false,
    "weight": true
  },
  "failure_reasons": [
    {
      "code": "APPEARANCE_MISMATCH",
      "message": "Expected white, round, approximately 10 mm"
    }
  ]
}
```

---

## 16. Local Feedback

The backend returns a result that the ESP32 uses to drive:

- OLED
- LED
- Buzzer
- Optional voice/speaker output

Example:

```text
VERIFIED
→ Green LED
→ Success sound
→ OLED: VERIFIED
```

```text
REJECTED
→ Red LED
→ Error sound
→ OLED: WEIGHT MISMATCH
```

The dashboard must mirror the same event.

---

## 17. Nurse Dashboard Requirements

The dashboard is a **nurse-facing monitoring and audit interface**.

It should display:

### Current Verification

- Patient
- Medication
- Prescription
- Verification status
- Patient authentication result
- Appearance result
- Weight result
- Specific failure reason
- Timestamp

### Verification History

- Verification ID
- Patient
- Medication
- Result
- Failed checks
- Timestamp

The dashboard should receive new verification events in real time.

Initial implementation may use WebSockets.

---

## 18. Real-Time Communication

Initial device communication:

```text
ESP32 → HTTP → FastAPI
```

Initial dashboard communication:

```text
FastAPI → WebSocket → Nurse Dashboard
```

MQTT can be considered later if device/event communication benefits from it, but it is not required for the first prototype.

---

## 19. Backend Project Structure

Proposed structure:

```text
backend/
│
├── app/
│   ├── main.py
│   │
│   ├── models/
│   │   ├── patient.py
│   │   ├── medication.py
│   │   ├── prescription.py
│   │   └── verification.py
│   │
│   ├── schemas/
│   │   ├── patient.py
│   │   ├── medication.py
│   │   ├── prescription.py
│   │   └── verification.py
│   │
│   ├── routes/
│   │   ├── patients.py
│   │   ├── medications.py
│   │   ├── prescriptions.py
│   │   └── verifications.py
│   │
│   ├── services/
│   │   ├── patient_service.py
│   │   ├── prescription_service.py
│   │   └── verification_service.py
│   │
│   ├── vision/
│   │   └── opencv_service.py
│   │
│   ├── websocket/
│   │   └── manager.py
│   │
│   └── database/
│       ├── database.py
│       └── base.py
│
├── tests/
├── requirements.txt
├── .env.example
├── PRD.md
└── README.md
```

The structure may be simplified during the hackathon if it becomes unnecessarily complex.

---

## 20. Development Phases

### Phase 1 — Backend Foundation

- [ ] Initialize Python/FastAPI project
- [ ] Configure SQLite
- [ ] Configure SQLAlchemy ORM
- [ ] Create database models
- [ ] Create Pydantic schemas
- [ ] Create database initialization

### Phase 2 — Core APIs

- [ ] Patient CRUD
- [ ] Medication CRUD
- [ ] Prescription CRUD
- [ ] RFID patient lookup
- [ ] Medication reference profile management

### Phase 3 — Verification Engine

- [ ] Patient authentication gate
- [ ] Prescription lookup
- [ ] Visual comparison
- [ ] Weight tolerance comparison
- [ ] Identity check
- [ ] Final verification decision
- [ ] Specific failure reasons

### Phase 4 — Verification History

- [ ] Save every verification attempt
- [ ] Store all individual check results
- [ ] Store measured values
- [ ] Add history APIs

### Phase 5 — Device Integration

- [ ] Define ESP32 API contract
- [ ] Receive RFID data
- [ ] Receive weight measurements
- [ ] Receive visual measurements
- [ ] Return verification result
- [ ] Support local device feedback

### Phase 6 — Dashboard Integration

- [ ] WebSocket manager
- [ ] Real-time verification events
- [ ] Current verification status
- [ ] Verification history
- [ ] Failure reason display

### Phase 7 — Vision Integration

- [ ] Camera input
- [ ] Colour extraction
- [ ] Shape detection
- [ ] Approximate size estimation
- [ ] Send structured visual measurements to verification engine

### Phase 8 — Hackathon Demo

- [ ] Seed demo patients
- [ ] Seed prescriptions
- [ ] Seed medication reference profiles
- [ ] Test correct medication
- [ ] Test wrong medication
- [ ] Test appearance mismatch
- [ ] Test weight mismatch
- [ ] Test unauthenticated patient
- [ ] Test complete verification history
- [ ] Test real-time dashboard updates

---

## 21. Important Prototype Assumptions

The hackathon prototype will use controlled medication samples and manually configured medication reference profiles.

The system should clearly distinguish:

```text
Medication strength
≠
Physical tablet weight
```

For example:

```text
Paracetamol strength: 500 mg
Reference tablet weight: 650 mg
```

The weight check verifies the **physical tablet weight**, not the amount of active pharmaceutical ingredient.

Similarly, visual verification checks physical appearance and does not chemically identify the drug.

---

## 22. Failure Codes

Use machine-readable failure codes so the ESP32 and dashboard can display consistent messages.

Initial codes:

```text
PATIENT_NOT_FOUND
PATIENT_NOT_AUTHENTICATED
NO_ACTIVE_PRESCRIPTION
MEDICATION_MISMATCH
APPEARANCE_MISMATCH
COLOR_MISMATCH
SHAPE_MISMATCH
SIZE_MISMATCH
WEIGHT_MISMATCH
WEIGHT_UNSTABLE
TARE_FAILED
INVALID_MEASUREMENT
```

A single verification may contain multiple failure codes.

---

## 23. Success Criteria

The backend prototype is considered successful when:

1. A valid RFID/QR identifies a patient.
2. An unauthenticated patient cannot proceed to medication verification.
3. The backend retrieves the patient's active prescription.
4. The expected medication profile is loaded.
5. Visual measurements can be compared with the profile.
6. Weight can be compared using a tolerance.
7. Medication is VERIFIED only when all required checks pass.
8. Failed checks return specific causes.
9. Every verification attempt is stored.
10. The result can be sent back to the ESP32.
11. The result can be pushed to the nurse dashboard in real time.
12. The system can demonstrate both successful and failed verification scenarios.

---

## 24. Future Production Considerations

These are not required for the hackathon but should be considered if the prototype evolves:

- PostgreSQL instead of SQLite
- Hospital EHR/EMR integration
- Secure device authentication
- Role-based access control
- Encrypted communication
- Audit-log integrity
- Medication manufacturer/reference-data integration
- Multiple medication manufacturers and batches
- Tablet/capsule differentiation
- More robust computer vision
- Calibration management
- Device health monitoring
- Regulatory and clinical validation

---

## 25. Core Product Statement

> **A nurse-facing medication safety checkpoint that authenticates the patient first, then independently verifies the prescribed medication using physical appearance and measured tablet weight, and accepts the medication only when all verification factors agree.**
