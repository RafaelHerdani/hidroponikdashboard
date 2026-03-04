# Branch Main Untuk Frontend Dashboard dan Simulasi Data

Dashboard monitoring real-time untuk sistem hidroponik indoor di Lab C502. Menampilkan data sensor dari 5 rak hidroponik, suhu & kelembaban ruangan, serta notifikasi otomatis.

---

## 📋 Daftar Isi

- [Arsitektur Sistem](#-arsitektur-sistem)
- [Tech Stack](#-tech-stack)
- [Struktur Project](#-struktur-project)
- [Cara Menjalankan](#-cara-menjalankan)
- [Frontend — Komponen Dashboard](#-frontend--komponen-dashboard)
- [Backend — FastAPI + PostgreSQL](#-backend--fastapi--postgresql)
- [MQTT Broker — Mosquitto](#-mqtt-broker--mosquitto)
- [Docker Compose](#-docker-compose)
- [ESP32 — Kode Arduino](#-esp32--kode-arduino)
- [Threshold & Status Sensor](#-threshold--status-sensor)
- [Sistem Notifikasi](#-sistem-notifikasi)
- [Roadmap](#-roadmap)

---

## 🏗 Arsitektur Sistem

```
┌───────────────────────────────────────────────────────────────────────────┐
│  HARDWARE (ESP32)                                                        │
│                                                                           │
│  Slave ESP32 (×5)              Master ESP32 (×1)                         │
│  ┌────────────┐                ┌────────────────┐                        │
│  │ DS18B20    │                │ ESP32          │                        │
│  │ pH Sensor  │──ESP-NOW──────→│ DHT22          │──MQTT──────┐          │
│  │ BH1750     │                │ MicroSD        │            │          │
│  │ EC Sensor  │                └────────────────┘            │          │
│  │ Water Level│                                               │          │
│  │ Water Flow │                                               │          │
│  └────────────┘                                               │          │
│   ×5 (satu per rak)                                           │          │
├───────────────────────────────────────────────────────────────│──────────┤
│  SERVER (Docker Compose)                                      ▼          │
│                                                                           │
│  ┌──────────────┐   ┌──────────────────┐   ┌──────────────┐             │
│  │  Mosquitto   │──→│  FastAPI (Python) │──→│  PostgreSQL  │             │
│  │  MQTT Broker │   │  Backend API      │   │  Database    │             │
│  │  :1883       │   │  :8000            │   │  :5432       │             │
│  └──────────────┘   └────────┬─────────┘   └──────────────┘             │
│                               │                                           │
│  ┌──────────────────────────────────────────────────────────┐             │
│  │  Next.js Dashboard   :3000                                │            │
│  │  GET /api/room  ←─── polling 3s ──── useRoomSensor()     │            │
│  │  GET /api/racks ←─── polling 3s ──── useRackSensor()     │            │
│  └──────────────────────────────────────────────────────────┘             │
└───────────────────────────────────────────────────────────────────────────┘
```

### Alur Data

1. **Slave ESP32** baca 6 sensor per rak → kirim via **ESP-NOW** ke Master
2. **Master ESP32** baca DHT22 + terima data Slave → publish ke **MQTT** (`hidroponik/room`, `hidroponik/rack/{id}`)
3. **Mosquitto** menerima MQTT messages → forward ke subscriber
4. **FastAPI** subscribe MQTT → parse JSON → simpan ke **PostgreSQL**
5. **Dashboard** poll `GET /api/room` dan `GET /api/racks` setiap 3 detik → tampilkan real-time

---

## 🛠 Tech Stack

| Layer | Teknologi | Kegunaan |
|-------|-----------|----------|
| **Frontend** | Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui, Recharts | Dashboard UI |
| **Backend** | FastAPI (Python 3.12), SQLAlchemy, aiomqtt | REST API + MQTT subscriber |
| **Database** | PostgreSQL 16 | Penyimpanan data sensor |
| **MQTT** | Eclipse Mosquitto 2 | Message broker IoT |
| **Container** | Docker Compose | Orkestrasi services |
| **Hardware** | ESP32 DevKit, DHT22, DS18B20, BH1750, pH/EC sensor | Sensor fisik |

---

## 📁 Struktur Project

```
hidroponikdashboard/
├── frontend/                    ← Next.js Dashboard
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx         # Halaman utama dashboard
│   │   ├── components/
│   │   │   ├── header.tsx       # Floating navbar (status, simulasi, tema)
│   │   │   ├── room-monitor.tsx # Monitor suhu & kelembaban ruangan
│   │   │   ├── rack-card.tsx    # Kartu sensor per rak
│   │   │   ├── summary-panel.tsx# Panel ringkasan status
│   │   │   ├── mini-chart.tsx   # Grafik sparkline
│   │   │   ├── notification-center.tsx
│   │   │   ├── water-tank.tsx
│   │   │   └── ui/             # Komponen shadcn/ui
│   │   └── lib/
│   │       ├── simulation.ts    # Hooks: useSimulation, useRoomSensor, useRackSensor
│   │       ├── thresholds.ts    # Batas aman sensor
│   │       ├── notifications.ts # Logika notifikasi
│   │       └── utils.ts
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                     ← FastAPI Backend
│   ├── app/
│   │   ├── main.py              # Entry point + MQTT startup
│   │   ├── database.py          # SQLAlchemy + PostgreSQL
│   │   ├── models.py            # Tabel SensorReading
│   │   ├── schemas.py           # Pydantic models
│   │   ├── thresholds.py        # Batas aman sensor (mirror frontend)
│   │   ├── mqtt_client.py       # MQTT subscriber
│   │   └── routes/
│   │       ├── room.py          # GET /api/room
│   │       └── rack.py          # GET /api/rack/{id}, GET /api/racks
│   ├── Dockerfile
│   └── requirements.txt
│
├── mosquitto/                   ← MQTT Broker Config
│   └── config/
│       └── mosquitto.conf
│
├── scripts/                     ← ESP32 & Simulators
│   ├── esp32_master.ino         # Master: WiFi + MQTT + DHT22 + ESP-NOW receiver
│   ├── esp32_slave.ino          # Slave: Baca 6 sensor + ESP-NOW sender
│   ├── esp32_dht22.ino          # Versi simpel: hanya DHT22 + MQTT
│   ├── simulate-mqtt.mjs        # MQTT Simulator (room + 5 rak)
│   └── simulate-esp32.mjs       # HTTP Simulator (legacy)
│
├── docker-compose.yml           ← Orkestrasi 3 container
├── package.json                 ← Root scripts (shortcuts)
├── README.md
└── .gitignore
```

---

## 🚀 Cara Menjalankan

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (untuk backend)
- [Node.js](https://nodejs.org/) v18+ (untuk frontend & simulator)

### 1. Start Backend (Docker)

```bash
docker compose up --build -d
```

Ini menjalankan 3 container:
- **Mosquitto** MQTT Broker (port 1883)
- **FastAPI** Backend (port 8000)
- **PostgreSQL** Database (port 5432)

### 2. Start Frontend

```bash
cd frontend
npm install    # pertama kali saja
npm run dev
```

Dashboard berjalan di `http://localhost:3000`

### 3. Start MQTT Simulator (pengganti ESP32)

```bash
npm run simulate:mqtt
```

Simulator mengirim data room + 5 rak ke MQTT broker setiap 5 detik.

### Shortcut dari Root

```bash
npm run dev              # → cd frontend && npm run dev
npm run simulate:mqtt    # → jalankan MQTT simulator
npm run docker:up        # → docker compose up --build -d
npm run docker:down      # → docker compose down
npm run docker:logs      # → docker compose logs -f backend
```

---

## 🖥 Frontend — Komponen Dashboard

### Layout

```
┌──────────────────────────────────────────────────┐
│              Welcome to Lab Smart Farming          │
│            All Systems Operating Normally           │
├─────────────────────┬────────────────────────────┤
│   Room Monitor      │     Summary Panel           │
│  (Temp + Humidity)  │  (Status 5 rak + alerts)   │
├─────────────────────┴────────────────────────────┤
│  Rack 1  │  Rack 2  │  Rack 3  │  Rack 4  │ Rack 5│
├──────────────────────────────────────────────────┤
│         🌱 Floating Navbar (Bottom)               │
└──────────────────────────────────────────────────┘
```

### Komponen Utama

| Komponen | Fungsi |
|----------|--------|
| **Header** | Floating navbar: status ESP32/server, toggle simulasi, mode (Stable/Up/Down), toggle tema |
| **Room Monitor** | Suhu & kelembaban ruangan dari API |
| **Rack Card** | 6 sensor per rak: Water Level, pH, EC, Water Temp, Water Flow, Light |
| **Summary Panel** | Status ringkasan tiap rak, total Normal/Warning/Critical |
| **Mini Chart** | Grafik sparkline riwayat data (Recharts) |
| **Notification Center** | Alert saat sensor berubah status + saran penanganan Bahasa Indonesia |

### Data Hooks

| Hook | Source | Interval |
|------|--------|----------|
| `useSimulation()` | Internal (dummy data) | 2.5s |
| `useRoomSensor()` | `GET http://localhost:8000/api/room` | 3s |
| `useRackSensor()` | `GET http://localhost:8000/api/racks` | 3s |

**Toggle Sim ON** → rack pakai data simulasi (mode Stable/Up/Down berfungsi)
**Toggle Sim OFF** → rack pakai data real dari API

---

## 🔌 Backend — FastAPI + PostgreSQL

### API Endpoints

| Method | Endpoint | Fungsi |
|--------|----------|--------|
| GET | `/` | Health check |
| GET | `/api/room` | Data terbaru room (temp + humidity + history) |
| GET | `/api/rack/{id}` | Data terbaru 1 rak (6 sensor + history) |
| GET | `/api/racks` | Data semua 5 rak |
| GET | `/docs` | Swagger API documentation |

### Database Schema

```
sensor_readings
├── id              (PK, auto increment)
├── device_id       ("room", "rack_1", "rack_2", ...)
├── sensor_type     ("temperature", "humidity", "ph", "ec", ...)
├── value           (float)
└── timestamp       (datetime, indexed)
```

### MQTT Subscriber

FastAPI secara otomatis subscribe ke `hidroponik/#` saat startup:
- `hidroponik/room` → simpan temperature & humidity
- `hidroponik/rack/{id}` → simpan 6 sensor per rak

---

## 📡 MQTT Broker — Mosquitto

| Setting | Value |
|---------|-------|
| Port | 1883 |
| Auth | Anonymous (development) |
| Persistence | Enabled |

### MQTT Topics

| Topic | Publisher | Payload |
|-------|----------|---------|
| `hidroponik/room` | Master ESP32 / Simulator | `{"temperature":26.5,"humidity":62}` |
| `hidroponik/rack/1..5` | Slave ESP32 / Simulator | `{"ph":6.0,"ec":1.5,"water_temp":24,"water_level":70,"water_flow":3.5,"light_intensity":20000}` |

---

## 🐳 Docker Compose

3 services terkoneksi dalam internal network:

| Container | Image | Port | Volume |
|-----------|-------|------|--------|
| `hidroponik-mqtt` | eclipse-mosquitto:2 | 1883 | mosquitto_data, mosquitto_log |
| `hidroponik-db` | postgres:16-alpine | 5432 | postgres_data |
| `hidroponik-backend` | Python 3.12 + FastAPI | 8000 | — |

```bash
docker compose up --build -d    # Start semua
docker compose down              # Stop semua
docker compose logs -f backend   # Lihat log backend
```

---

## 🔧 ESP32 — Kode Arduino

### 3 File Tersedia

| File | Fungsi | Komunikasi |
|------|--------|------------|
| `esp32_master.ino` | Master: DHT22 + terima 5 Slave + MQTT publish | WiFi + ESP-NOW + MQTT |
| `esp32_slave.ino` | Slave: Baca 6 sensor per rak | ESP-NOW (tanpa WiFi) |
| `esp32_dht22.ino` | Simpel: hanya DHT22 room sensor | WiFi + MQTT |

### Library Arduino

- `PubSubClient` (MQTT)
- `DHT sensor library` (Adafruit)
- `OneWire` + `DallasTemperature` (DS18B20)
- `BH1750` (cahaya)
- `ArduinoJson`

### Wiring Master

```
DHT22 VCC  → 3.3V
DHT22 GND  → GND
DHT22 DATA → GPIO 4
```

### Wiring Slave (per rak)

```
DS18B20    → GPIO 4  (OneWire, waterproof)
pH Sensor  → GPIO 34 (Analog)
EC Sensor  → GPIO 35 (Analog)
BH1750     → GPIO 21/22 (I2C SDA/SCL)
Water Level→ GPIO 32 (Analog)
Water Flow → GPIO 27 (Digital interrupt)
```

### Konfigurasi

**Master** — edit `MQTT_SERVER`:
```cpp
const char* MQTT_SERVER = "192.168.x.x";  // IP laptop/server Docker
```

**Slave** — edit `RACK_ID` dan `MASTER_MAC`:
```cpp
#define RACK_ID  1  // 1, 2, 3, 4, atau 5
uint8_t MASTER_MAC[] = {0x24, 0x6F, 0x28, 0xAB, 0xCD, 0xEF};
```

---

## ⚠️ Threshold & Status Sensor

| Sensor | Normal | Warning | Critical | Unit |
|--------|--------|---------|----------|------|
| Suhu Ruangan | 24 – 30 | < 24 / > 30 | < 20 / > 35 | °C |
| Kelembaban | 50 – 70 | < 50 / > 70 | < 40 / > 80 | % |
| pH Air | 5.5 – 6.5 | < 5.5 / > 6.5 | < 4.5 / > 7.5 | pH |
| EC Nutrisi | 1.0 – 2.5 | < 1.0 / > 2.5 | < 0.5 / > 3.0 | mS/cm |
| Suhu Air | 18 – 28 | < 18 / > 28 | < 15 / > 32 | °C |
| Water Level | > 30 | < 30 | < 15 | % |
| Water Flow | > 1.0 | < 1.0 | < 0.2 | L/min |
| Light | 10k – 40k | < 10k / > 40k | < 5k / > 45k | lux |

| Status | Warna | Indikator |
|--------|-------|-----------|
| Normal | 🟢 Emerald | Stabil |
| Low / High | 🟡 Amber | Perlu perhatian |
| Critical | 🔴 Red | Butuh tindakan segera (pulse) |

---

## 🔔 Sistem Notifikasi

Saat sensor berubah status (Normal → Warning/Critical), notifikasi otomatis muncul dengan **saran penanganan** Bahasa Indonesia:

| Sensor | Kondisi | Saran |
|--------|---------|-------|
| pH rendah | < 5.5 | Tambahkan larutan pH Up secara bertahap |
| pH tinggi | > 6.5 | Tambahkan larutan pH Down secara bertahap |
| EC rendah | < 1.0 | Tambahkan larutan nutrisi AB Mix |
| EC tinggi | > 2.5 | Encerkan dengan menambahkan air bersih |
| Water Flow rendah | < 1.0 | Periksa pompa air — kemungkinan tersumbat |
| Suhu ruangan tinggi | > 30 | Nyalakan AC atau tingkatkan ventilasi |

---

## 🗺 Roadmap

| Phase | Status | Deskripsi |
|-------|--------|-----------|
| 1 ✅ | Selesai | Frontend dashboard + simulasi data dummy |
| 2 ✅ | Selesai | Backend API (FastAPI + PostgreSQL + Mosquitto) di Docker |
| 3 ✅ | Selesai | Dashboard 100% API-driven (room + 5 rak) |
| 4 ✅ | Selesai | Kode Arduino Master + Slave ESP32 |
| 5 ✅ | Selesai | Reorganisasi project (frontend/backend/mosquitto) |
| 6 ⬜ | Belum | Perakitan hardware + flash ESP32 |
| 7 ⬜ | Belum | Deploy ke server kampus + subdomain |
