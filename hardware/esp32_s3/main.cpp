/**
 * =====================================================
 * AIRA ESP32-S3 — Patient Gate Controller
 * Firmware v2.0
 *
 * Responsibilities:
 *   1. Scan patient RFID card → POST /api/rfid/scan
 *   2. Store last verified RFID in memory (30s session)
 *   3. Physical button press → POST /api/camera/trigger
 *      with the active RFID so backend knows which patient
 *
 * Hardware:
 *   RC522 RFID reader (SPI)
 *   Physical scan button (GPIO 2, INPUT_PULLUP)
 *
 * Dependencies (platformio.ini):
 *   bblanchon/ArduinoJson @ ^6.21.5
 *   miguelbalboa/MFRC522 @ ^1.4.11
 * =====================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <MFRC522.h>


// =====================================================
// CONFIG — Edit these to match your setup
// =====================================================

const char* WIFI_SSID     = "VISHAL";
const char* WIFI_PASSWORD = "VISHAL MS";

// Your PC's local IP running the FastAPI server
const char* SERVER_IP   = "10.208.142.77";
const int   SERVER_PORT = 8000;         // FastAPI runs on 8000

// Patient RFID session TTL (30 seconds)
const unsigned long SESSION_TTL_MS = 30000;


// =====================================================
// RC522 PINS (SPI)
// =====================================================

#define RFID_SS   4
#define RFID_RST  5
#define RFID_SCK  12
#define RFID_MISO 13
#define RFID_MOSI 11

MFRC522 rfid(RFID_SS, RFID_RST);


// =====================================================
// PHYSICAL BUTTON — GPIO 2 → button → GND
// INPUT_PULLUP: Released = HIGH, Pressed = LOW
// =====================================================

#define SCAN_BUTTON 2


// =====================================================
// STATE
// =====================================================

// RFID duplicate guard
String        lastUID          = "";
unsigned long lastScanTime     = 0;
const unsigned long RFID_RESCAN_DELAY_MS = 3000;

// Active patient session
String        activeRFID       = "";
bool          sessionActive    = false;
unsigned long sessionStart     = 0;

// Button debounce
bool          buttonStableState  = HIGH;
bool          buttonLastReading  = HIGH;
unsigned long buttonLastChange   = 0;
const unsigned long DEBOUNCE_MS  = 60;

// Camera trigger cooldown
unsigned long lastCameraTrigger    = 0;
const unsigned long CAMERA_COOLDOWN_MS = 3000;


// =====================================================
// HELPERS
// =====================================================

String buildURL(const char* path) {
    return String("http://") + SERVER_IP + ":" + SERVER_PORT + path;
}

String getUID() {
    String uid = "";
    for (byte i = 0; i < rfid.uid.size; i++) {
        if (i > 0) uid += ":";
        if (rfid.uid.uidByte[i] < 0x10) uid += "0";
        uid += String(rfid.uid.uidByte[i], HEX);
    }
    uid.toUpperCase();
    return uid;
}

bool isSessionValid() {
    return sessionActive && (millis() - sessionStart < SESSION_TTL_MS);
}

void clearSession() {
    activeRFID    = "";
    sessionActive = false;
    Serial.println("[SESSION] Expired — tap RFID card again");
}


// =====================================================
// WIFI
// =====================================================

void connectWiFi() {
    Serial.print("[WiFi] Connecting to ");
    Serial.println(WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 40) {
        delay(500);
        Serial.print(".");
        attempts++;
    }
    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
        Serial.print("[WiFi] Connected — IP: ");
        Serial.println(WiFi.localIP());
    } else {
        Serial.println("[WiFi] FAILED — will retry on next request");
    }
}

void ensureWiFi() {
    if (WiFi.status() != WL_CONNECTED) connectWiFi();
}


// =====================================================
// RFID SCAN
// POST /api/rfid/scan
// Body:     {"uid": "AA:BB:CC:DD"}
// Response: {"verified": true, "patient_name": "John Doe"}
//
// HTTP 200  → patient verified → open session
// HTTP 404  → unknown RFID
// other     → server/network error
// =====================================================

void sendRFID(const String& uid) {
    ensureWiFi();
    if (WiFi.status() != WL_CONNECTED) return;

    Serial.println();
    Serial.println("========== RFID SCAN ==========");
    Serial.print("[RFID] UID: ");
    Serial.println(uid);

    HTTPClient http;
    http.begin(buildURL("/api/rfid/scan"));
    http.setConnectTimeout(2000);
    http.setTimeout(5000);
    http.addHeader("Content-Type", "application/json");

    StaticJsonDocument<64> reqDoc;
    reqDoc["uid"] = uid;
    String body;
    serializeJson(reqDoc, body);

    int code = http.POST(body);
    Serial.print("[RFID] HTTP: ");
    Serial.println(code);

    if (code == 200) {
        String raw = http.getString();
        StaticJsonDocument<256> resDoc;
        DeserializationError err = deserializeJson(resDoc, raw);

        if (!err && resDoc["verified"].as<bool>()) {
            const char* name = resDoc["patient_name"] | "Unknown";
            Serial.print("[RFID] VERIFIED: ");
            Serial.println(name);

            // Open session
            activeRFID    = uid;
            sessionActive = true;
            sessionStart  = millis();
            Serial.println("[SESSION] Active for 30s — press button to scan pill");
        } else {
            Serial.println("[RFID] NOT VERIFIED");
            clearSession();
        }

    } else if (code == 404) {
        Serial.println("[RFID] UNKNOWN — patient not in system");
        clearSession();
    } else {
        Serial.print("[RFID] Server error: ");
        Serial.println(code);
    }

    http.end();
    Serial.println("================================");
}


// =====================================================
// CAMERA TRIGGER
// POST /api/camera/trigger
// Body:     {"rfid": "AA:BB:CC:DD"}
// Response: {"status": "triggered"}
//
// Only fires when:
//   - A valid patient session is active
//   - Cooldown has elapsed since last trigger
// =====================================================

void triggerCameraScan() {
    if (!isSessionValid()) {
        Serial.println("[BTN] No active session — tap RFID card first");
        return;
    }

    if (millis() - lastCameraTrigger < CAMERA_COOLDOWN_MS) {
        Serial.println("[BTN] Cooldown — wait before triggering again");
        return;
    }

    ensureWiFi();
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[BTN] Camera trigger failed — no WiFi");
        return;
    }

    lastCameraTrigger = millis();

    Serial.println();
    Serial.println("======== CAMERA TRIGGER ========");
    Serial.print("[BTN] Patient RFID: ");
    Serial.println(activeRFID);

    HTTPClient http;
    http.begin(buildURL("/api/camera/trigger"));
    http.setConnectTimeout(2000);
    http.setTimeout(10000);
    http.addHeader("Content-Type", "application/json");

    // Send the active patient's RFID so backend can link the image to the right patient
    StaticJsonDocument<64> doc;
    doc["rfid"] = activeRFID;
    String body;
    serializeJson(doc, body);

    int code = http.POST(body);
    Serial.print("[BTN] HTTP: ");
    Serial.println(code);

    if (code == 200) {
        Serial.println("[BTN] Camera scan triggered — check nurse dashboard");
    } else {
        Serial.print("[BTN] Failed: ");
        Serial.println(code);
    }

    http.end();
    Serial.println("================================");
}


// =====================================================
// BUTTON DEBOUNCE
// =====================================================

void processButton() {
    bool reading = digitalRead(SCAN_BUTTON);

    if (reading != buttonLastReading) {
        buttonLastChange  = millis();
        buttonLastReading = reading;
    }

    if ((millis() - buttonLastChange) > DEBOUNCE_MS) {
        if (reading != buttonStableState) {
            buttonStableState = reading;
            if (buttonStableState == LOW) {
                triggerCameraScan();
            }
        }
    }
}


// =====================================================
// SETUP
// =====================================================

void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println();
    Serial.println("====================================");
    Serial.println("       AIRA ESP32-S3 v2.0");
    Serial.println("   RFID GATE + SCAN BUTTON");
    Serial.println("====================================");

    pinMode(SCAN_BUTTON, INPUT_PULLUP);

    SPI.begin(RFID_SCK, RFID_MISO, RFID_MOSI, RFID_SS);
    rfid.PCD_Init();
    delay(100);
    Serial.println("[RC522] Initialized");

    connectWiFi();

    Serial.println();
    Serial.println("====================================");
    Serial.println("READY");
    Serial.println("  Step 1: Tap RFID card");
    Serial.println("  Step 2: Press button to scan pill");
    Serial.println("====================================");
}


// =====================================================
// LOOP
// =====================================================

void loop() {
    // Expire stale session
    if (sessionActive && !isSessionValid()) {
        clearSession();
    }

    // RFID reader
    if (rfid.PICC_IsNewCardPresent() && rfid.PICC_ReadCardSerial()) {
        String uid = getUID();

        bool isDuplicate = (uid == lastUID) &&
                           (millis() - lastScanTime < RFID_RESCAN_DELAY_MS);
        if (!isDuplicate) {
            lastUID      = uid;
            lastScanTime = millis();
            sendRFID(uid);
        }

        rfid.PICC_HaltA();
        rfid.PCD_StopCrypto1();
    }

    processButton();
    delay(10);
}
