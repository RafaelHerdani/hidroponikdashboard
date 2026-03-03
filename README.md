# 🌱 Lab Smart Farming — Dashboard Monitoring Hidroponik

Dashboard monitoring real-time untuk sistem hidroponik indoor di Lab C502. Menampilkan data sensor dari 5 rak hidroponik, suhu & kelembaban ruangan, serta notifikasi otomatis.

---

## 📋 Daftar Isi

- [Fitur](#-fitur)
- [Tech Stack](#-tech-stack)
- [Struktur Project](#-struktur-project)
- [Cara Menjalankan](#-cara-menjalankan)
- [Arsitektur Sistem](#-arsitektur-sistem)
- [Frontend — Komponen Dashboard](#-frontend--komponen-dashboard)
- [Simulasi Data Dummy](#-simulasi-data-dummy)
- [Backend API](#-backend-api)
- [Koneksi ESP32](#-koneksi-esp32)
- [Threshold & Status Sensor](#-threshold--status-sensor)
- [Sistem Notifikasi](#-sistem-notifikasi)
- [Roadmap](#-roadmap)

---

## ✨ Fitur

- **Dashboard real-time** — Data sensor diperbarui setiap 2.5 detik (simulasi) atau 5 detik (ESP32)
- **5 Rak Hidroponik** — Setiap rak menampilkan: Water Level, pH, EC/Nutrisi, Water Temp, Water Flow, Light Intensity
- **Room Monitor** — Suhu dan kelembaban ruangan (dari API / ESP32)
- **Status otomatis** — Normal, Warning, Low, High, Critical dengan warna indikator
- **Notifikasi** — Alert otomatis saat sensor masuk zona warning/critical, lengkap dengan saran penanganan
- **Mini chart** — Grafik riwayat data 25 data point terakhir
- **Simulasi mode** — Stable, Trending Up, Trending Down untuk testing
- **Dark/Light mode** — Toggle tema dengan desain inverted
- **Floating navbar** — Navigation bar di bagian bawah layar
- **Responsive threshold** — Batas warning/critical berbeda per jenis sensor

---

## 🛠 Tech Stack

| Teknologi | Kegunaan |
|-----------|----------|
| **Next.js 16** | Framework React (frontend + API routes) |
| **TypeScript** | Type safety |
| **Tailwind CSS 4** | Styling |
| **shadcn/ui** | Komponen UI (Card, Badge, Tooltip, Switch, dll) |
| **Recharts** | Mini chart untuk riwayat data |
| **Lucide React** | Ikon |
| **next-themes** | Toggle dark/light mode |

---

## 📁 Struktur Project

```
hidroponikdashboard/
├── scripts/
│   ├── simulate-esp32.mjs      # Simulator ESP32 (pengganti hardware)
│   └── esp32_dht22.ino         # Kode Arduino untuk ESP32 fisik
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── room/
│   │   │       └── route.ts    # API endpoint POST/GET sensor ruangan
│   │   ├── globals.css         # Global styles & Tailwind config
│   │   ├── layout.tsx          # Root layout + metadata
│   │   └── page.tsx            # Halaman utama dashboard
│   ├── components/
│   │   ├── header.tsx          # Floating navbar (status, simulasi, tema)
│   │   ├── room-monitor.tsx    # Monitor suhu & kelembaban ruangan
│   │   ├── rack-card.tsx       # Kartu sensor per rak hidroponik
│   │   ├── summary-panel.tsx   # Panel ringkasan status semua rak
│   │   ├── mini-chart.tsx      # Grafik sparkline riwayat data
│   │   ├── notification-center.tsx  # Pusat notifikasi sensor
│   │   ├── water-tank.tsx      # Komponen visual tangki air
│   │   ├── theme-provider.tsx  # Provider tema dark/light
│   │   └── ui/                 # Komponen shadcn/ui (Button, Card, dll)
│   └── lib/
│       ├── simulation.ts       # Simulasi data + hook useRoomSensor
│       ├── thresholds.ts       # Konfigurasi batas aman sensor
│       ├── notifications.ts    # Logika notifikasi & remediasi
│       └── utils.ts            # Utility functions
└── package.json
```

---

## 🚀 Cara Menjalankan

### 1. Install Dependencies

```bash
npm install
```

### 2. Jalankan Dashboard

```bash
npm run dev
```

Dashboard berjalan di `http://localhost:3000`

### 3. Jalankan Simulator ESP32 (Opsional)

```bash
npm run simulate
```

Simulator mengirim data suhu & kelembaban ke API setiap 5 detik.

---

## 🏗 Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            WiFi Router                                  │
└─────────┬──────────────────────────────────────────┬────────────────────┘
          │                                          │
          ▼                                          ▼
┌─────────────────────┐                   ┌─────────────────────────────┐
│  ESP32 + DHT22      │   HTTP POST       │  Server (Next.js)           │
│  (atau Simulator)   │ ────────────────→ │                             │
│                     │  setiap 5 detik   │  POST /api/room  → Simpan  │
│  Baca sensor:       │                   │  GET  /api/room  → Ambil   │
│  - Temperature      │                   │                             │
│  - Humidity         │                   │  Data disimpan di memory    │
└─────────────────────┘                   │  (in-memory, tanpa DB)     │
                                          │                             │
                                          │  Dashboard (React):         │
                                          │  - Poll API setiap 3 dtk   │
                                          │  - Tampilkan data real-time │
                                          │  - Rack: simulasi dummy    │
                                          └─────────────────────────────┘
```

### Alur Data

1. **ESP32 / Simulator** membaca sensor → kirim `POST /api/room` dengan JSON `{temperature, humidity}`
2. **API Route** menerima data → simpan ke variabel in-memory beserta riwayat (25 entry)
3. **Dashboard** memanggil `GET /api/room` setiap 3 detik → update Room Monitor
4. **Rack data** masih menggunakan simulasi internal (belum terhubung ke sensor)

---

## 🖥 Frontend — Komponen Dashboard

### Halaman Utama (`page.tsx`)

Layout terdiri dari:

```
┌──────────────────────────────────────────────────┐
│              Welcome to Lab Smart Farming          │
│            All Systems Operating Normally           │
├─────────────────────┬────────────────────────────┤
│   Room Monitor      │     Summary Panel           │
│  (Temp + Humidity)  │  (Status 5 rak + alerts)   │
├─────────────────────┴────────────────────────────┤
│  Rack 1  │  Rack 2  │  Rack 3  │  Rack 4  │ Rack 5│
│          │          │          │          │       │
├──────────────────────────────────────────────────┤
│         🌱 Floating Navbar (Bottom)               │
└──────────────────────────────────────────────────┘
```

### Komponen Utama

| Komponen | File | Fungsi |
|----------|------|--------|
| **Header** | `header.tsx` | Floating navbar di bawah. Menampilkan: status ESP32 & server, toggle simulasi, mode simulasi (Stable/Up/Down), toggle tema, collapse |
| **Room Monitor** | `room-monitor.tsx` | 2 kartu: Suhu Ruangan (dari API) dan Kelembaban Ruangan (dari API). Mendukung variant `inverted` untuk dark bg di light mode |
| **Rack Card** | `rack-card.tsx` | Kartu per rak: menampilkan 6 sensor dengan nilai, status badge, trend, progress bar, dan mini chart water flow |
| **Summary Panel** | `summary-panel.tsx` | Indikator status tiap rak, ringkasan Total/Normal/Warning/Critical, dan active alerts |
| **Mini Chart** | `mini-chart.tsx` | Grafik sparkline kecil menggunakan Recharts, warna mengikuti status sensor |
| **Notification Center** | `notification-center.tsx` | Panel notifikasi yang menampilkan alert saat sensor berubah status, lengkap dengan saran penanganan dalam Bahasa Indonesia |

### Desain Visual

- **Light mode**: Beberapa elemen menggunakan warna inverted (bg gelap) untuk kontras:
  - Header: `bg-gray-900` dengan teks putih
  - Rack card header: `bg-gray-900`
  - Room Temperature card: `bg-gray-900` (inverted)
  - Summary rack indicators: `bg-gray-900`
  - Light sensor card: `bg-gray-900` (inverted)
- **Dark mode**: Tetap menggunakan warna standar dark theme

---

## 🎮 Simulasi Data Dummy

### Cara Kerja (`simulation.ts`)

Simulasi menggunakan hook `useSimulation()` yang:

1. **Inisialisasi** — Membuat data awal 5 rak dengan nilai random dalam range normal
2. **Tick setiap 2.5 detik** — Memperbarui semua sensor rak menggunakan fungsi `drift()`
3. **Room data tidak disimulasikan** — Room temperature & humidity hanya dari API

### Fungsi `drift()`

```
drift(current, min, max, volatility, mode)
```

Nilai sensor "bergeser" secara natural menggunakan:

- **Noise random** — Fluktuasi kecil acak
- **Pull toward target** — Tarikan ke arah target berdasarkan mode
- **Mode Stable** — Target di tengah range (normal)
- **Mode Trending Up** — Target di 85% range (masuk zona warning/critical atas)
- **Mode Trending Down** — Target di 15% range (masuk zona warning/critical bawah)

### Mode Simulasi

| Mode | Target | Efek |
|------|--------|------|
| **Stable** | Tengah range | Nilai stabil di zona normal |
| **Trending Up** | 85% range | Nilai naik menuju warning/critical atas |
| **Trending Down** | 15% range | Nilai turun menuju warning/critical bawah |

---

## 🔌 Backend API

### `POST /api/room`

Menerima data sensor dari ESP32 atau simulator.

```json
// Request
POST http://localhost:3000/api/room
Content-Type: application/json

{
    "temperature": 26.5,
    "humidity": 62.0
}

// Response
{ "success": true }
```

### `GET /api/room`

Mengambil data terbaru untuk dashboard.

```json
// Response
{
    "temperature": {
        "value": 26.5,
        "history": [26.3, 26.4, 26.5, ...],
        "status": "Normal"
    },
    "humidity": {
        "value": 62.0,
        "history": [61.8, 62.0, 62.1, ...],
        "status": "Normal"
    },
    "lastUpdated": "2026-02-26T04:07:46.406Z",
    "esp32Online": true
}
```

### Detail Implementasi

- **Penyimpanan**: In-memory (variabel module-level), reset saat server restart
- **Riwayat**: Menyimpan 25 data point terakhir per sensor
- **Deteksi offline**: `esp32Online = true` jika POST terakhir < 15 detik yang lalu
- **Status**: Dikalkulasi otomatis berdasarkan threshold di `thresholds.ts`

### Hook `useRoomSensor()`

Dashboard menggunakan hook `useRoomSensor()` yang:

1. Poll `GET /api/room` setiap 3 detik
2. Return `{ roomData, esp32Online }`
3. Jika data tersedia → digunakan oleh Room Monitor
4. Jika tidak ada data → fallback ke data simulasi awal

---

## 🔧 Koneksi ESP32

### Simulator (Tanpa Hardware)

File: `scripts/simulate-esp32.mjs`

```bash
npm run simulate
```

- Mengirim data suhu (~26°C) dan kelembaban (~62%) setiap 5 detik
- Menggunakan algoritma drift yang sama dengan simulasi frontend
- Terhubung ke `http://localhost:3000/api/room`

### ESP32 Fisik (Dengan Hardware)

File referensi: `scripts/esp32_dht22.ino`

#### Hardware yang Dibutuhkan

| Komponen | Fungsi |
|----------|--------|
| ESP32 DevKit V1 | Mikrokontroler + WiFi |
| DHT22 | Sensor suhu + kelembaban |
| Kabel jumper | Koneksi |

#### Wiring

```
DHT22 VCC  → ESP32 3.3V
DHT22 GND  → ESP32 GND
DHT22 DATA → ESP32 GPIO 4
```

#### Library Arduino

- `DHT sensor library` (Adafruit)
- `ArduinoJson` (Benoit Blanchon)
- `Adafruit Unified Sensor`

#### Konfigurasi

Edit 3 baris di `esp32_dht22.ino`:

```cpp
const char* WIFI_SSID     = "WiFi_Lab_C502";
const char* WIFI_PASSWORD = "password123";
const char* SERVER_URL    = "http://192.168.x.x:3000/api/room";
```

#### Cara Kerja

1. ESP32 nyala → auto-connect WiFi (~3 detik)
2. Baca sensor DHT22 setiap 5 detik
3. Kirim `HTTP POST` ke server API
4. Jika WiFi putus → auto-reconnect
5. Dashboard otomatis menampilkan data real

#### Protokol Komunikasi

- **Transport**: TCP via WiFi
- **Application**: HTTP/1.1 REST API
- **Format**: JSON
- **Method**: POST
- **Port**: 3000

---

## ⚠️ Threshold & Status Sensor

Konfigurasi di `thresholds.ts`:

| Sensor | Normal | Warning | Critical | Unit |
|--------|--------|---------|----------|------|
| Suhu Ruangan | 24 – 30 | < 24 atau > 30 | < 20 atau > 35 | °C |
| Kelembaban | 50 – 70 | < 50 atau > 70 | < 40 atau > 80 | % |
| pH Air | 5.5 – 6.5 | < 5.5 atau > 6.5 | < 4.5 atau > 7.5 | pH |
| EC Nutrisi | 1.0 – 2.5 | < 1.0 atau > 2.5 | < 0.5 atau > 3.0 | mS/cm |
| Suhu Air | 18 – 28 | < 18 atau > 28 | < 15 atau > 32 | °C |
| Water Level | > 30 | < 30 | < 15 | % |
| Water Flow | > 1.0 | < 1.0 | < 0.2 | L/min |
| Light | 10k – 40k | < 10k atau > 40k | < 5k atau > 45k | lux |

### Status Visual

| Status | Warna | Indikator |
|--------|-------|-----------|
| Normal | 🟢 Hijau (emerald) | Stabil |
| Low / High | 🟡 Kuning (amber) | Perlu perhatian |
| Warning | 🟡 Kuning (amber) | Perlu tindakan |
| Critical | 🔴 Merah (rose) | Butuh tindakan segera, animasi pulse |

---

## 🔔 Sistem Notifikasi

### Cara Kerja (`notifications.ts`)

1. Setiap kali data sensor berubah, sistem mengecek apakah ada **transisi status**
2. Jika sensor berubah dari Normal → Warning/Critical (atau antar level), notifikasi dibuat
3. Notifikasi berisi **saran penanganan** dalam Bahasa Indonesia

### Contoh Saran Penanganan

| Sensor | Kondisi | Saran |
|--------|---------|-------|
| pH | Terlalu rendah | "Tambahkan larutan pH Up secara bertahap dan ukur kembali setelah 30 menit." |
| pH | Terlalu tinggi | "Tambahkan larutan pH Down secara bertahap dan ukur kembali setelah 30 menit." |
| Water Flow | Terlalu rendah | "Periksa pompa air — kemungkinan tersumbat, rusak, atau mati. Bersihkan filter." |
| Suhu Ruangan | Terlalu tinggi | "Turunkan suhu ruangan — nyalakan AC atau tingkatkan ventilasi." |
| EC Nutrisi | Terlalu rendah | "Tambahkan larutan nutrisi AB Mix sesuai takaran, lalu aduk rata." |

---

## 🗺 Roadmap

| Phase | Status | Deskripsi |
|-------|--------|-----------|
| 1 ✅ | Selesai | Frontend dashboard + simulasi data dummy |
| 2 ✅ | Selesai | Backend API + koneksi ESP32 (Room Temp & Humidity) |
| 3 ⬜ | Belum | Sensor Water Tank (pH, EC, Water Temp, Water Level) × 5 |
| 4 ⬜ | Belum | Sensor Rack (Light, Water Flow) × 5 |
| 5 ⬜ | Belum | Database (PostgreSQL/SQLite) untuk riwayat permanen |
| 6 ⬜ | Belum | Deploy ke subdomain kampus |
