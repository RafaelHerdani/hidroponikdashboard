/**
 * ESP32 Simulator — Room Temperature & Humidity
 *
 * Simulates an ESP32 + DHT22 sensor sending data to the dashboard API.
 * Run: node scripts/simulate-esp32.mjs
 *
 * Data drifts around realistic values:
 *   Temperature: ~26°C (range 22-34°C)
 *   Humidity:    ~62%  (range 40-80%)
 */

const API_URL = process.env.API_URL || "http://localhost:3000/api/room";
const INTERVAL_MS = 5000; // Send every 5 seconds

let temperature = 26.5;
let humidity = 62.0;

function drift(current, target, min, max, volatility = 0.3) {
    const range = max - min;
    const noise = (Math.random() - 0.5) * 2 * volatility * range * 0.02;
    const pull = (target - current) * 0.01;
    const newVal = current + noise + pull;
    return Math.min(max, Math.max(min, newVal));
}

async function sendData() {
    temperature = drift(temperature, 26.5, 22, 34, 0.2);
    humidity = drift(humidity, 62, 40, 80, 0.2);

    const payload = {
        temperature: Math.round(temperature * 10) / 10,
        humidity: Math.round(humidity * 10) / 10,
    };

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (res.ok) {
            const time = new Date().toLocaleTimeString();
            console.log(
                `[${time}] ✅ Sent: Temp=${payload.temperature}°C  Humidity=${payload.humidity}%`
            );
        } else {
            console.error(`[ERROR] Server responded ${res.status}: ${await res.text()}`);
        }
    } catch (err) {
        console.error(`[ERROR] Could not connect to ${API_URL}:`, err.message);
        console.error("       Make sure 'npm run dev' is running first!");
    }
}

// --- Start ---
console.log("🌱 ESP32 Simulator — Room Temperature & Humidity");
console.log(`   Sending to: ${API_URL}`);
console.log(`   Interval: ${INTERVAL_MS / 1000}s`);
console.log("   Press Ctrl+C to stop\n");

// Send first data immediately
sendData();

// Then send every INTERVAL_MS
setInterval(sendData, INTERVAL_MS);
