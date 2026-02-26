import { NextResponse } from "next/server";
import { getStatus } from "@/lib/thresholds";

const HISTORY_LENGTH = 25;
const OFFLINE_TIMEOUT_MS = 15000; // 15 seconds

interface SensorStore {
    value: number;
    history: number[];
}

// In-memory store (resets on server restart)
let store: {
    temperature: SensorStore;
    humidity: SensorStore;
    lastUpdated: Date | null;
} = {
    temperature: { value: 0, history: [] },
    humidity: { value: 0, history: [] },
    lastUpdated: null,
};

/**
 * POST /api/room
 * Receives sensor data from ESP32 or simulator.
 * Body: { temperature: number, humidity: number }
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { temperature, humidity } = body;

        if (typeof temperature !== "number" || typeof humidity !== "number") {
            return NextResponse.json(
                { error: "Invalid data. Expected { temperature: number, humidity: number }" },
                { status: 400 }
            );
        }

        // Update temperature
        store.temperature.value = temperature;
        store.temperature.history = [
            ...store.temperature.history.slice(-(HISTORY_LENGTH - 1)),
            temperature,
        ];

        // Update humidity
        store.humidity.value = humidity;
        store.humidity.history = [
            ...store.humidity.history.slice(-(HISTORY_LENGTH - 1)),
            humidity,
        ];

        store.lastUpdated = new Date();

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json(
            { error: "Invalid JSON body" },
            { status: 400 }
        );
    }
}

/**
 * GET /api/room
 * Returns latest room sensor data for the dashboard.
 */
export async function GET() {
    const now = new Date();
    const esp32Online =
        store.lastUpdated !== null &&
        now.getTime() - store.lastUpdated.getTime() < OFFLINE_TIMEOUT_MS;

    // If no data has been received yet
    if (!store.lastUpdated) {
        return NextResponse.json({
            temperature: null,
            humidity: null,
            lastUpdated: null,
            esp32Online: false,
        });
    }

    return NextResponse.json({
        temperature: {
            value: store.temperature.value,
            history: store.temperature.history,
            status: getStatus(store.temperature.value, "roomTemp"),
        },
        humidity: {
            value: store.humidity.value,
            history: store.humidity.history,
            status: getStatus(store.humidity.value, "roomHumidity"),
        },
        lastUpdated: store.lastUpdated.toISOString(),
        esp32Online,
    });
}
