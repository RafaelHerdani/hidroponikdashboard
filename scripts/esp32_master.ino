/*
 * ============================================================
 *  MASTER ESP32 — Lab Smart Farming
 * ============================================================
 *
 *  Fungsi:
 *    1. Baca DHT22 (suhu & kelembaban ruangan)
 *    2. Terima data dari 5 Slave ESP32 via ESP-NOW
 *    3. Publish semua data ke MQTT broker
 *    4. Auto-reconnect WiFi & MQTT
 *
 *  MQTT Topics:
 *    hidroponik/room       → {"temperature":26.5,"humidity":62}
 *    hidroponik/rack/1..5  → {"ph":6.0,"ec":1.5,...}
 *
 *  Library yang dibutuhkan (install via Arduino Library Manager):
 *    - PubSubClient (by Nick O'Leary)
 *    - DHT sensor library (by Adafruit)
 *    - Adafruit Unified Sensor
 *    - ArduinoJson (by Benoit Blanchon)
 *
 *  Board: ESP32 Dev Module
 * ============================================================
 */

#include <ArduinoJson.h>
#include <DHT.h>
#include <PubSubClient.h>
#include <WiFi.h>
#include <esp_now.h>
#include <esp_wifi.h>


// ===== CONFIGURATION =====
const char *WIFI_SSID = "ACES";
const char *WIFI_PASSWORD = "bukanuntukifdansi";
const char *MQTT_SERVER =
    "192.168.1.100"; // IP server/laptop yang menjalankan Docker
const int MQTT_PORT = 1883;
const char *MQTT_CLIENT = "esp32-master";

#define DHT_PIN 4
#define DHT_TYPE DHT22

// ===== GLOBALS =====
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);
DHT dht(DHT_PIN, DHT_TYPE);

// Interval pengiriman data (ms)
const unsigned long SEND_INTERVAL = 5000;
unsigned long lastSend = 0;

// ===== ESP-NOW: Data structure dari Slave =====
// HARUS SAMA PERSIS dengan struct di Slave ESP32
typedef struct {
  int rack_id;
  float ph;
  float ec;
  float water_temp;
  float water_level;
  float water_flow;
  float light_intensity;
} SlaveData;

// Buffer data terakhir dari setiap slave
SlaveData slaveBuffer[5];
bool slaveUpdated[5] = {false, false, false, false, false};

// ===== ESP-NOW: Callback saat data diterima dari Slave =====
void onDataRecv(const esp_now_recv_info_t *info, const uint8_t *data, int len) {
  if (len != sizeof(SlaveData)) {
    Serial.println("⚠️ ESP-NOW: Invalid data size received");
    return;
  }

  SlaveData received;
  memcpy(&received, data, sizeof(SlaveData));

  int idx = received.rack_id - 1; // rack_id 1-5 → index 0-4
  if (idx >= 0 && idx < 5) {
    slaveBuffer[idx] = received;
    slaveUpdated[idx] = true;
    Serial.printf("📩 ESP-NOW: Rack %d data received (pH=%.2f, EC=%.2f)\n",
                  received.rack_id, received.ph, received.ec);
  }
}

// ===== WiFi Setup =====
void setupWiFi() {
  Serial.printf("Connecting to WiFi: %s", WIFI_SSID);
  WiFi.mode(WIFI_AP_STA); // Dual mode: AP (untuk ESP-NOW) + STA (untuk WiFi)
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n✅ WiFi connected! IP: %s\n",
                  WiFi.localIP().toString().c_str());
    Serial.printf("   WiFi Channel: %d\n", WiFi.channel());
  } else {
    Serial.println("\n❌ WiFi failed! Restarting...");
    delay(3000);
    ESP.restart();
  }
}

// ===== ESP-NOW Setup =====
void setupESPNow() {
  if (esp_now_init() != ESP_OK) {
    Serial.println("❌ ESP-NOW init failed!");
    return;
  }
  esp_now_register_recv_cb(onDataRecv);
  Serial.println("✅ ESP-NOW initialized — ready to receive slave data");

  // Print MAC address (slaves need this to send data)
  Serial.printf("   Master MAC: %s\n", WiFi.macAddress().c_str());
}

// ===== MQTT Setup & Reconnect =====
void setupMQTT() {
  mqtt.setServer(MQTT_SERVER, MQTT_PORT);
  mqtt.setBufferSize(512);
}

void reconnectMQTT() {
  while (!mqtt.connected()) {
    Serial.printf("Connecting to MQTT %s:%d...", MQTT_SERVER, MQTT_PORT);
    if (mqtt.connect(MQTT_CLIENT)) {
      Serial.println(" ✅ Connected!");
    } else {
      Serial.printf(" ❌ Failed (rc=%d). Retry in 3s...\n", mqtt.state());
      delay(3000);
    }
  }
}

// ===== Publish Room Data (DHT22) =====
void publishRoom() {
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();

  if (isnan(temp) || isnan(hum)) {
    Serial.println("⚠️ DHT22 read failed!");
    return;
  }

  JsonDocument doc;
  doc["temperature"] = round(temp * 10.0) / 10.0;
  doc["humidity"] = round(hum * 10.0) / 10.0;

  char buffer[128];
  serializeJson(doc, buffer);

  mqtt.publish("hidroponik/room", buffer);
  Serial.printf("🏠 Room: Temp=%.1f°C  Humidity=%.1f%%\n", temp, hum);
}

// ===== Publish Rack Data (dari ESP-NOW buffer) =====
void publishRacks() {
  for (int i = 0; i < 5; i++) {
    if (!slaveUpdated[i])
      continue; // Skip jika belum ada data baru

    SlaveData &s = slaveBuffer[i];

    JsonDocument doc;
    doc["ph"] = round(s.ph * 100.0) / 100.0;
    doc["ec"] = round(s.ec * 100.0) / 100.0;
    doc["water_temp"] = round(s.water_temp * 10.0) / 10.0;
    doc["water_level"] = round(s.water_level);
    doc["water_flow"] = round(s.water_flow * 10.0) / 10.0;
    doc["light_intensity"] = round(s.light_intensity);

    char buffer[256];
    serializeJson(doc, buffer);

    char topic[32];
    sprintf(topic, "hidroponik/rack/%d", i + 1);
    mqtt.publish(topic, buffer);

    Serial.printf("🌿 Rack %d: pH=%.2f EC=%.2f WTemp=%.1f WLevel=%.0f "
                  "Flow=%.1f Light=%.0f\n",
                  i + 1, s.ph, s.ec, s.water_temp, s.water_level, s.water_flow,
                  s.light_intensity);

    slaveUpdated[i] = false; // Mark as sent
  }
}

// ===== Arduino Setup =====
void setup() {
  Serial.begin(115200);
  Serial.println("\n========================================");
  Serial.println("  Lab Smart Farming — Master ESP32");
  Serial.println("========================================\n");

  dht.begin();
  setupWiFi();
  setupESPNow();
  setupMQTT();
}

// ===== Arduino Loop =====
void loop() {
  // Reconnect WiFi if disconnected
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi disconnected. Reconnecting...");
    setupWiFi();
  }

  // Reconnect MQTT if disconnected
  if (!mqtt.connected()) {
    reconnectMQTT();
  }
  mqtt.loop();

  // Publish data setiap SEND_INTERVAL
  unsigned long now = millis();
  if (now - lastSend >= SEND_INTERVAL) {
    lastSend = now;
    publishRoom();
    publishRacks();
    Serial.println("---");
  }
}
