/**
 * MQTT Simulator — publishes room + rack sensor data to the MQTT broker.
 * Simulates 1 room sensor (DHT22) + 5 racks with 6 sensors each.
 *
 * Usage:
 *   npm run simulate:mqtt
 *
 * Topics:
 *   hidroponik/room       → {temperature, humidity}
 *   hidroponik/rack/1..5  → {ph, ec, water_temp, water_level, water_flow, light_intensity}
 */

import mqtt from "mqtt";

const BROKER = process.env.MQTT_BROKER || "mqtt://localhost:1883";
const INTERVAL_MS = 5000;

// --- Drift function (same as frontend simulation) ---
function drift(current, target, min, max, volatility = 0.3) {
    const range = max - min;
    const noise = (Math.random() - 0.5) * 2 * volatility * range * 0.02;
    const pull = (target - current) * 0.01;
    return Math.min(max, Math.max(min, current + noise + pull));
}

// --- Room sensor state ---
let roomTemp = 26.5;
let roomHumidity = 62.0;

// --- Rack sensor states (5 racks) ---
const racks = Array.from({ length: 5 }, (_, i) => ({
    id: i + 1,
    ph: 5.8 + Math.random() * 0.5,
    ec: 1.4 + Math.random() * 0.6,
    water_temp: 22 + Math.random() * 4,
    water_level: 50 + Math.random() * 30,
    water_flow: 2.5 + Math.random() * 2,
    light_intensity: 18000 + Math.random() * 10000,
}));

// --- Connect and publish ---
const client = mqtt.connect(BROKER);

client.on("connect", () => {
    console.log("🌱 MQTT Simulator — Full System (Room + 5 Racks)");
    console.log(`   Broker: ${BROKER}`);
    console.log(`   Interval: ${INTERVAL_MS / 1000}s`);
    console.log("   Press Ctrl+C to stop\n");

    function publish() {
        const time = new Date().toLocaleTimeString();

        // --- Room ---
        roomTemp = drift(roomTemp, 26.5, 22, 34, 0.2);
        roomHumidity = drift(roomHumidity, 62, 40, 80, 0.2);

        const roomPayload = {
            temperature: Math.round(roomTemp * 10) / 10,
            humidity: Math.round(roomHumidity * 10) / 10,
        };
        client.publish("hidroponik/room", JSON.stringify(roomPayload));
        console.log(
            `[${time}] 🏠 Room: Temp=${roomPayload.temperature}°C  Humidity=${roomPayload.humidity}%`
        );

        // --- Racks ---
        for (const rack of racks) {
            rack.ph = drift(rack.ph, 6.0, 4.0, 8.0, 0.1);
            rack.ec = drift(rack.ec, 1.8, 0.5, 3.2, 0.15);
            rack.water_temp = drift(rack.water_temp, 24, 16, 32, 0.2);
            rack.water_level = drift(rack.water_level, 65, 5, 100, 0.15);
            rack.water_flow = drift(rack.water_flow, 3.5, 0.0, 8.0, 0.2);
            rack.light_intensity = drift(rack.light_intensity, 22000, 3000, 45000, 0.15);

            const rackPayload = {
                ph: Math.round(rack.ph * 100) / 100,
                ec: Math.round(rack.ec * 100) / 100,
                water_temp: Math.round(rack.water_temp * 10) / 10,
                water_level: Math.round(rack.water_level),
                water_flow: Math.round(rack.water_flow * 10) / 10,
                light_intensity: Math.round(rack.light_intensity),
            };

            client.publish(`hidroponik/rack/${rack.id}`, JSON.stringify(rackPayload));
            console.log(
                `[${time}] 🌿 Rack ${rack.id}: pH=${rackPayload.ph} EC=${rackPayload.ec} WTemp=${rackPayload.water_temp}°C WLevel=${rackPayload.water_level}% Flow=${rackPayload.water_flow}L/min Light=${rackPayload.light_intensity}lux`
            );
        }
        console.log("");
    }

    publish();
    setInterval(publish, INTERVAL_MS);
});

client.on("error", (err) => {
    console.error(`❌ MQTT error: ${err.message}`);
    console.error("   Make sure 'docker compose up' is running!");
    process.exit(1);
});
