/*
 * ============================================================
 *  ESP32 + DHT22 (MQTT Version) — Lab Smart Farming
 * ============================================================
 *
 *  Versi sederhana: HANYA baca DHT22 dan publish ke MQTT.
 *  Gunakan ini jika hanya ingin test room sensor tanpa Slave.
 *
 *  Untuk versi lengkap (Master + ESP-NOW receiver), lihat:
 *    → esp32_master.ino
 *
 *  Library yang dibutuhkan:
 *    - PubSubClient (by Nick O'Leary)
 *    - DHT sensor library (by Adafruit)
 *    - Adafruit Unified Sensor
 *
 *  Board: ESP32 Dev Module
 * ============================================================
 */

#include <DHT.h>
#include <PubSubClient.h>
#include <WiFi.h>


// ===== CONFIGURATION =====
const char *WIFI_SSID = "ACES";
const char *WIFI_PASSWORD = "bukanuntukifdansi";
const char *MQTT_SERVER = "192.168.1.100"; // IP server/laptop Docker
const int MQTT_PORT = 1883;

#define DHT_PIN 4
#define DHT_TYPE DHT22

// ===== GLOBALS =====
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);
DHT dht(DHT_PIN, DHT_TYPE);

unsigned long lastSend = 0;
const unsigned long INTERVAL = 5000;

void setupWiFi() {
  Serial.printf("Connecting to WiFi: %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.printf("\n✅ Connected! IP: %s\n", WiFi.localIP().toString().c_str());
}

void reconnectMQTT() {
  while (!mqtt.connected()) {
    Serial.print("Connecting to MQTT...");
    if (mqtt.connect("esp32-dht22")) {
      Serial.println(" ✅ OK");
    } else {
      Serial.printf(" ❌ Failed (rc=%d). Retry...\n", mqtt.state());
      delay(3000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  Serial.println("\n🌱 ESP32 DHT22 — MQTT Room Sensor\n");

  dht.begin();
  setupWiFi();
  mqtt.setServer(MQTT_SERVER, MQTT_PORT);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED)
    setupWiFi();
  if (!mqtt.connected())
    reconnectMQTT();
  mqtt.loop();

  if (millis() - lastSend >= INTERVAL) {
    lastSend = millis();

    float temp = dht.readTemperature();
    float hum = dht.readHumidity();

    if (isnan(temp) || isnan(hum)) {
      Serial.println("⚠️ DHT22 read failed!");
      return;
    }

    char payload[64];
    sprintf(payload, "{\"temperature\":%.1f,\"humidity\":%.1f}", temp, hum);

    mqtt.publish("hidroponik/room", payload);
    Serial.printf("✅ Published: Temp=%.1f°C  Humidity=%.1f%%\n", temp, hum);
  }
}
