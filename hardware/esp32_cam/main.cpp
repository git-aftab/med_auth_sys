/**
 * =====================================================
 * AIRA ESP32-CAM — Pill Image Capture Unit
 * Firmware v2.0
 *
 * Responsibilities:
 *   Listens on Serial for a single-byte trigger command
 *   from the PC bridge (serial_bridge.py):
 *     'C' or 'c' → capture JPEG → send over Serial
 *
 * Protocol (Serial output):
 *   [7 bytes] 'A','I','R','A','I','M','G'   ← magic header
 *   [4 bytes] JPEG length (uint32, little-endian)
 *   [N bytes] raw JPEG data
 *
 * The PC-side serial_bridge.py reads this stream,
 * extracts the JPEG, and POSTs it to the FastAPI server.
 *
 * Hardware:
 *   AI Thinker ESP32-CAM + OV3660 sensor
 *   Flash LED on GPIO 4
 *
 * =====================================================
 */

#include "esp_camera.h"
#include <Arduino.h>


// =====================================================
// AI THINKER ESP32-CAM PIN MAP
// =====================================================

#define PWDN_GPIO_NUM  32
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM   0
#define SIOD_GPIO_NUM  26
#define SIOC_GPIO_NUM  27
#define Y9_GPIO_NUM    35
#define Y8_GPIO_NUM    34
#define Y7_GPIO_NUM    39
#define Y6_GPIO_NUM    36
#define Y5_GPIO_NUM    21
#define Y4_GPIO_NUM    19
#define Y3_GPIO_NUM    18
#define Y2_GPIO_NUM     5
#define VSYNC_GPIO_NUM 25
#define HREF_GPIO_NUM  23
#define PCLK_GPIO_NUM  22

#define FLASH_LED      4


// =====================================================
// SERIAL BAUD
// Must match serial_bridge.py BAUD_RATE constant
// =====================================================

#define SERIAL_BAUD 460800


// =====================================================
// BINARY FRAME PROTOCOL
//   Magic:  7 bytes  "AIRAIMG"
//   Length: 4 bytes  uint32 little-endian
//   Data:   N bytes  raw JPEG
// =====================================================

const uint8_t IMAGE_HEADER[]   = { 'A','I','R','A','I','M','G' };
const size_t  IMAGE_HEADER_LEN = 7;


// =====================================================
// CAMERA INIT
// =====================================================

bool initCamera() {
    camera_config_t config = {};

    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer   = LEDC_TIMER_0;
    config.pin_d0       = Y2_GPIO_NUM;
    config.pin_d1       = Y3_GPIO_NUM;
    config.pin_d2       = Y4_GPIO_NUM;
    config.pin_d3       = Y5_GPIO_NUM;
    config.pin_d4       = Y6_GPIO_NUM;
    config.pin_d5       = Y7_GPIO_NUM;
    config.pin_d6       = Y8_GPIO_NUM;
    config.pin_d7       = Y9_GPIO_NUM;
    config.pin_xclk     = XCLK_GPIO_NUM;
    config.pin_pclk     = PCLK_GPIO_NUM;
    config.pin_vsync    = VSYNC_GPIO_NUM;
    config.pin_href     = HREF_GPIO_NUM;
    config.pin_sccb_sda = SIOD_GPIO_NUM;
    config.pin_sccb_scl = SIOC_GPIO_NUM;
    config.pin_pwdn     = PWDN_GPIO_NUM;
    config.pin_reset    = RESET_GPIO_NUM;
    config.xclk_freq_hz = 20000000;
    config.pixel_format = PIXFORMAT_JPEG;

    if (psramFound()) {
        // Higher quality when PSRAM available
        config.frame_size   = FRAMESIZE_VGA;    // 640x480
        config.jpeg_quality = 10;               // 0-63 lower = better
        config.fb_count     = 2;
        config.grab_mode    = CAMERA_GRAB_LATEST;
    } else {
        config.frame_size   = FRAMESIZE_QVGA;   // 320x240
        config.jpeg_quality = 12;
        config.fb_count     = 1;
        config.grab_mode    = CAMERA_GRAB_WHEN_EMPTY;
    }

    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        Serial.printf("[CAM] Init failed: 0x%x\n", err);
        return false;
    }

    // Sensor tuning
    sensor_t* s = esp_camera_sensor_get();
    if (s) {
        s->set_brightness(s, 0);     // -2 to 2
        s->set_contrast(s, 1);       // -2 to 2
        s->set_saturation(s, 0);     // -2 to 2
        s->set_sharpness(s, 1);      // -2 to 2
        s->set_exposure_ctrl(s, 1);  // auto exposure on
        s->set_gain_ctrl(s, 1);      // auto gain on
        s->set_whitebal(s, 1);       // auto white balance on
        s->set_awb_gain(s, 1);       // AWB gain on
        s->set_hmirror(s, 0);
        s->set_vflip(s, 0);
    }

    return true;
}


// =====================================================
// FLASH HELPERS
// =====================================================

void flashOn()  { digitalWrite(FLASH_LED, HIGH); }
void flashOff() { digitalWrite(FLASH_LED, LOW);  }


// =====================================================
// SEND uint32 LITTLE-ENDIAN OVER SERIAL
// =====================================================

void sendUInt32LE(uint32_t value) {
    Serial.write((uint8_t)(value         & 0xFF));
    Serial.write((uint8_t)((value >>  8) & 0xFF));
    Serial.write((uint8_t)((value >> 16) & 0xFF));
    Serial.write((uint8_t)((value >> 24) & 0xFF));
}


// =====================================================
// CAPTURE AND SEND
// Triggered by 'C' command from serial_bridge.py
// =====================================================

void captureAndSend() {
    Serial.println("[CAM] Capture requested");

    // Flash on → stabilise → capture → flash off
    flashOn();
    delay(150);
    camera_fb_t* fb = esp_camera_fb_get();
    flashOff();

    if (!fb) {
        Serial.println("[CAM] CAPTURE FAILED");
        // Send an error sentinel: header with length 0
        Serial.write(IMAGE_HEADER, IMAGE_HEADER_LEN);
        sendUInt32LE(0);
        Serial.flush();
        return;
    }

    Serial.printf("[CAM] JPEG %u bytes  %ux%u\n",
                  (unsigned)fb->len, fb->width, fb->height);

    // --- Binary frame ---
    // 1. Magic header
    Serial.write(IMAGE_HEADER, IMAGE_HEADER_LEN);

    // 2. JPEG byte length (uint32 LE)
    sendUInt32LE((uint32_t)fb->len);

    // 3. Raw JPEG data
    Serial.write(fb->buf, fb->len);
    Serial.flush();

    esp_camera_fb_return(fb);

    Serial.println("[CAM] Image sent");
}


// =====================================================
// PROCESS SERIAL COMMANDS
//   'C' or 'c' → capture and send image
// =====================================================

void processSerial() {
    while (Serial.available() > 0) {
        char cmd = (char)Serial.read();
        if (cmd == 'C' || cmd == 'c') {
            captureAndSend();
        }
        // Discard any other stray bytes silently
    }
}


// =====================================================
// SETUP
// =====================================================

void setup() {
    Serial.begin(SERIAL_BAUD);
    delay(1000);

    pinMode(FLASH_LED, OUTPUT);
    flashOff();

    Serial.println();
    Serial.println("====================================");
    Serial.println("      AIRA ESP32-CAM v2.0");
    Serial.println("    OV3660 — SERIAL CONTROLLED");
    Serial.println("====================================");

    if (psramFound()) {
        Serial.printf("[CAM] PSRAM: %u bytes\n", ESP.getPsramSize());
    } else {
        Serial.println("[CAM] No PSRAM — using QVGA");
    }

    if (!initCamera()) {
        Serial.println("[CAM] FATAL: Camera init failed — halting");
        while (true) delay(1000);
    }

    Serial.println("[CAM] OV3660 Ready");
    Serial.println();
    Serial.println("Waiting for 'C' command from bridge...");
    Serial.println("====================================");
}


// =====================================================
// LOOP
// =====================================================

void loop() {
    processSerial();
    delay(5);
}
