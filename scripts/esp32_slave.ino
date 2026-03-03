/*
 * ============================================================
 *  SLAVE ESP32 — Lab Smart Farming (1 unit per rak)
 * ============================================================
 *
 *  Fungsi:
 *    1. Baca 6 sensor:
 *       - DS18B20    → Suhu air (waterproof)
 *       - PH-4502C   → pH air
 *       - TDS Meter  → EC / konduktivitas nutrisi
 *       - BH1750     → Intensitas cahaya
 *       - Water Level → Level air tangki (analog)
 *       - YF-S201    → Water flow rate
 *    2. Kirim data ke Master ESP32 via ESP-NOW
 *
 *  Library yang dibutuhkan (install via Arduino Library Manager):
 *    - OneWire (by Jim Studt)
 *    - DallasTemperature (by Miles Burton)
 *    - BH1750 (by Christopher Laws)
 *
 *  Board: ESP32 Dev Module
 *
 *  PENTING: Ubah RACK_ID sesuai rak (1-5)
 *  PENTING: Ubah MASTER_MAC sesuai MAC address Master ESP32
 * ============================================================
 */

#include <BH1750.h>
#include <DallasTemperature.h>
#include <OneWire.h>
#include <WiFi.h>
#include <Wire.h>
#include <esp_now.h>


// ===== CONFIGURATION =====
// ⚠️ GANTI INI UNTUK SETIAP RAK (1, 2, 3, 4, atau 5)
#define RACK_ID 1

// ⚠️ GANTI DENGAN MAC ADDRESS MASTER ESP32
// Jalankan Master ESP32, lihat Serial Monitor untuk MAC address
uint8_t MASTER_MAC[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
// Contoh: {0x24, 0x6F, 0x28, 0xAB, 0xCD, 0xEF}

// ===== PIN CONFIGURATION =====
#define DS18B20_PIN 4      // OneWire (suhu air, waterproof)
#define PH_SENSOR_PIN 34   // Analog (pH)
#define EC_SENSOR_PIN 35   // Analog (EC/TDS)
#define WATER_LEVEL_PIN 32 // Analog (level air)
#define FLOW_SENSOR_PIN 27 // Digital (interrupt, water flow)
#define BH1750_SDA 21      // I2C SDA
#define BH1750_SCL 22      // I2C SCL

// ===== SEND INTERVAL =====
const unsigned long SEND_INTERVAL = 5000; // kirim setiap 5 detik
unsigned long lastSend = 0;

// ===== DATA STRUCTURE (HARUS SAMA DENGAN MASTER) =====
typedef struct {
  int rack_id;
  float ph;
  float ec;
  float water_temp;
  float water_level;
  float water_flow;
  float light_intensity;
} SlaveData;

// ===== SENSOR OBJECTS =====
OneWire oneWire(DS18B20_PIN);
DallasTemperature ds18b20(&oneWire);
BH1750 lightMeter;

// ===== WATER FLOW =====
volatile int flowPulseCount = 0;
float flowRate = 0.0;
unsigned long lastFlowCalc = 0;

void IRAM_ATTR flowPulseISR() { flowPulseCount++; }

// ===== ESP-NOW Callback =====
esp_now_peer_info_t peerInfo;

void onDataSent(const uint8_t *mac_addr, esp_now_send_status_t status) {
  if (status == ESP_NOW_SEND_SUCCESS) {
    Serial.println("✅ Data sent to Master");
  } else {
    Serial.println("❌ Send failed — check Master is online");
  }
}

// ===== SENSOR READING FUNCTIONS =====

// DS18B20 — Suhu Air
float readWaterTemp() {
  ds18b20.requestTemperatures();
  float temp = ds18b20.getTempCByIndex(0);
  if (temp == DEVICE_DISCONNECTED_C) {
    Serial.println("⚠️ DS18B20 not connected!");
    return -1;
  }
  return temp;
}

// PH-4502C — pH Sensor (Analog)
// Kalibrasi: sesuaikan OFFSET dan SLOPE dengan larutan kalibrasi pH 4.0 dan
// pH 7.0
float readPH() {
  int raw = analogRead(PH_SENSOR_PIN);
  float voltage = raw * (3.3 / 4095.0);

  // Rumus kalibrasi default (sesuaikan setelah kalibrasi manual)
  // pH 7.0 → ~2.5V, pH 4.0 → ~3.0V (tergantung modul)
  float ph = 7.0 + ((2.5 - voltage) / 0.18);

  return constrain(ph, 0.0, 14.0);
}

// TDS/EC Sensor (Analog)
// Mengukur konduktivitas nutrisi
float readEC() {
  int raw = analogRead(EC_SENSOR_PIN);
  float voltage = raw * (3.3 / 4095.0);

  // Konversi voltage → EC (mS/cm)
  // Rumus default, sesuaikan setelah kalibrasi
  float ec = (voltage / 3.3) * 5.0;

  return constrain(ec, 0.0, 10.0);
}

// Water Level Sensor (Analog)
// Return persentase (0-100%)
float readWaterLevel() {
  int raw = analogRead(WATER_LEVEL_PIN);

  // Map dari range analog ke persentase
  // Sesuaikan MIN_VAL dan MAX_VAL berdasarkan sensor
  const int MIN_VAL = 0;    // Sensor kering (tangki kosong)
  const int MAX_VAL = 2500; // Sensor tercelup penuh
  float percentage = ((float)(raw - MIN_VAL) / (MAX_VAL - MIN_VAL)) * 100.0;

  return constrain(percentage, 0.0, 100.0);
}

// YF-S201 — Water Flow Sensor
// Dihitung berdasarkan pulse per detik
float readWaterFlow() {
  unsigned long now = millis();
  unsigned long elapsed = now - lastFlowCalc;

  if (elapsed >= 1000) { // Hitung setiap 1 detik
    // YF-S201: 7.5 pulsa = 1 Liter/menit
    noInterrupts();
    int pulses = flowPulseCount;
    flowPulseCount = 0;
    interrupts();

    flowRate = (pulses / 7.5); // Liter per menit
    lastFlowCalc = now;
  }

  return flowRate;
}

// BH1750 — Light Intensity (I2C)
float readLight() {
  float lux = lightMeter.readLightLevel();
  if (lux < 0) {
    Serial.println("⚠️ BH1750 error!");
    return -1;
  }
  return lux;
}

// ===== Arduino Setup =====
void setup() {
  Serial.begin(115200);
  Serial.printf("\n========================================\n");
  Serial.printf("  Lab Smart Farming — Slave ESP32\n");
  Serial.printf("  Rack ID: %d\n", RACK_ID);
  Serial.printf("========================================\n\n");

  // WiFi harus di STA mode untuk ESP-NOW
  WiFi.mode(WIFI_STA);
  Serial.printf("Slave MAC: %s\n", WiFi.macAddress().c_str());

  // Init ESP-NOW
  if (esp_now_init() != ESP_OK) {
    Serial.println("❌ ESP-NOW init failed!");
    return;
  }
  esp_now_register_send_cb(onDataSent);

  // Register Master sebagai peer
  memcpy(peerInfo.peer_addr, MASTER_MAC, 6);
  peerInfo.channel = 0; // Auto match channel
  peerInfo.encrypt = false;

  if (esp_now_add_peer(&peerInfo) != ESP_OK) {
    Serial.println("❌ Failed to add Master as peer!");
    return;
  }
  Serial.println("✅ ESP-NOW ready — Master registered as peer");

  // Init sensors
  ds18b20.begin();
  Wire.begin(BH1750_SDA, BH1750_SCL);
  lightMeter.begin();
  pinMode(FLOW_SENSOR_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), flowPulseISR, RISING);

  Serial.println("✅ All sensors initialized\n");
}

// ===== Arduino Loop =====
void loop() {
  // Update water flow calculation continuously
  readWaterFlow();

  unsigned long now = millis();
  if (now - lastSend >= SEND_INTERVAL) {
    lastSend = now;

    // Read all sensors
    SlaveData data;
    data.rack_id = RACK_ID;
    data.ph = readPH();
    data.ec = readEC();
    data.water_temp = readWaterTemp();
    data.water_level = readWaterLevel();
    data.water_flow = flowRate;
    data.light_intensity = readLight();

    // Print values
    Serial.printf("📊 Rack %d Readings:\n", RACK_ID);
    Serial.printf("   pH:          %.2f\n", data.ph);
    Serial.printf("   EC:          %.2f mS/cm\n", data.ec);
    Serial.printf("   Water Temp:  %.1f °C\n", data.water_temp);
    Serial.printf("   Water Level: %.0f %%\n", data.water_level);
    Serial.printf("   Water Flow:  %.1f L/min\n", data.water_flow);
    Serial.printf("   Light:       %.0f lux\n", data.light_intensity);

    // Send via ESP-NOW to Master
    esp_err_t result = esp_now_send(MASTER_MAC, (uint8_t *)&data, sizeof(data));
    if (result != ESP_OK) {
      Serial.printf("❌ ESP-NOW send error: %d\n", result);
    }
    Serial.println("---");
  }
}
