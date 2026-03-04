"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getStatus, type Status, THRESHOLDS } from "./thresholds";
import type { DashboardData, RackData, SensorData } from "./simulation";

export interface Notification {
    id: string;
    timestamp: Date;
    rackLabel: string;
    sensorLabel: string;
    sensorType: string;
    status: Status;
    value: number;
    unit: string;
    message: string; // cara penanganan
}

/**
 * Remediation messages per sensor type + direction.
 */
const REMEDIATION: Record<string, { low: string; high: string }> = {
    waterLevel: {
        low: "Segera isi ulang air pada tangki nutrisi.",
        high: "Kurangi volume air pada tangki.",
    },
    ph: {
        low: "Tambahkan larutan pH Up secara bertahap dan ukur kembali setelah 30 menit.",
        high: "Tambahkan larutan pH Down secara bertahap dan ukur kembali setelah 30 menit.",
    },
    ec: {
        low: "Tambahkan larutan nutrisi AB Mix sesuai takaran, lalu aduk rata.",
        high: "Encerkan larutan nutrisi dengan menambahkan air bersih secara bertahap.",
    },
    waterTemp: {
        low: "Gunakan heater akuarium atau pindahkan tangki ke tempat yang lebih hangat.",
        high: "Tambahkan es batu ke tangki atau gunakan water chiller.",
    },
    waterFlow: {
        low: "Periksa pompa air — kemungkinan tersumbat, rusak, atau mati. Bersihkan filter.",
        high: "Kurangi kecepatan pompa atau periksa apakah ada kebocoran pada pipa.",
    },
    lightIntensity: {
        low: "Periksa lampu grow light — kemungkinan mati atau terlalu jauh dari tanaman.",
        high: "Kurangi intensitas lampu atau tambah jarak dari tanaman. Gunakan timer.",
    },
    roomTemp: {
        low: "Naikkan suhu ruangan — nyalakan heater atau kurangi AC.",
        high: "Turunkan suhu ruangan — nyalakan AC atau tingkatkan ventilasi.",
    },
    roomHumidity: {
        low: "Gunakan humidifier untuk menaikkan kelembaban ruangan.",
        high: "Gunakan dehumidifier atau tingkatkan sirkulasi udara.",
    },
};

function getRemediation(sensorType: string, status: Status): string {
    const entry = REMEDIATION[sensorType];
    if (!entry) return "Periksa sensor dan pastikan dalam kondisi normal.";
    if (status === "Low" || status === "Critical") {
        // Check if it's a "low" type critical
        return entry.low;
    }
    if (status === "High") {
        return entry.high;
    }
    // For Warning status, try to determine direction from value
    return entry.low;
}

function getRemediationSmart(
    sensorType: string,
    status: Status,
    value: number
): string {
    const entry = REMEDIATION[sensorType];
    if (!entry) return "Periksa sensor dan pastikan dalam kondisi normal.";

    const thresh = THRESHOLDS[sensorType];
    if (!thresh) return entry.low;

    // Determine direction: is the value below or above the normal range?
    const midpoint =
        ((thresh.warningLow ?? thresh.min) + (thresh.warningHigh ?? thresh.max)) / 2;
    if (value < midpoint) {
        return entry.low;
    }
    return entry.high;
}

const SENSOR_LABELS: Record<string, string> = {
    waterLevel: "Water Level",
    ph: "pH",
    ec: "EC/Nutrisi",
    waterTemp: "Suhu Air",
    waterFlow: "Water Flow",
    lightIntensity: "Intensitas Cahaya",
    roomTemp: "Suhu Ruangan",
    roomHumidity: "Kelembaban Ruangan",
};

function checkSensor(
    rackLabel: string,
    sensorType: string,
    sensor: SensorData,
    prevStatuses: Map<string, Status>,
    notifications: Notification[]
): void {
    const key = `${rackLabel}::${sensorType}`;
    const prevStatus = prevStatuses.get(key);
    const currentStatus = sensor.status;

    // Only log when status transitions INTO warning/critical territory
    const isWarning =
        currentStatus === "Warning" ||
        currentStatus === "Low" ||
        currentStatus === "High" ||
        currentStatus === "Critical";

    const wasWarning =
        prevStatus === "Warning" ||
        prevStatus === "Low" ||
        prevStatus === "High" ||
        prevStatus === "Critical";

    if (isWarning && (!wasWarning || prevStatus !== currentStatus)) {
        const config = THRESHOLDS[sensorType];
        notifications.push({
            id: `${key}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: new Date(),
            rackLabel,
            sensorLabel: SENSOR_LABELS[sensorType] || sensorType,
            sensorType,
            status: currentStatus,
            value: sensor.value,
            unit: config?.unit || "",
            message: getRemediationSmart(sensorType, currentStatus, sensor.value),
        });
    }

    prevStatuses.set(key, currentStatus);
}

const MAX_NOTIFICATIONS = 50;

export function useNotifications(data: DashboardData | null) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [readCount, setReadCount] = useState(0);
    const prevStatuses = useRef<Map<string, Status>>(new Map());
    const initialized = useRef(false);

    useEffect(() => {
        if (!data) return;

        // On first render, just record all statuses without generating notifications
        if (!initialized.current) {
            initialized.current = true;
            // Seed statuses
            data.racks.forEach((rack) => {
                const sensors: [string, SensorData][] = [
                    ["waterLevel", rack.waterLevel],
                    ["ph", rack.ph],
                    ["ec", rack.ec],
                    ["waterTemp", rack.waterTemp],
                    ["waterFlow", rack.waterFlow],
                    ["lightIntensity", rack.lightIntensity],
                ];
                sensors.forEach(([type, sensor]) => {
                    prevStatuses.current.set(`${rack.label}::${type}`, sensor.status);
                });
            });
            // Room sensors
            prevStatuses.current.set(
                "Room::roomTemp",
                data.room.temperature.status
            );
            prevStatuses.current.set(
                "Room::roomHumidity",
                data.room.humidity.status
            );
            return;
        }

        const newNotifs: Notification[] = [];

        // Check rack sensors
        data.racks.forEach((rack) => {
            const sensors: [string, SensorData][] = [
                ["waterLevel", rack.waterLevel],
                ["ph", rack.ph],
                ["ec", rack.ec],
                ["waterTemp", rack.waterTemp],
                ["waterFlow", rack.waterFlow],
                ["lightIntensity", rack.lightIntensity],
            ];
            sensors.forEach(([type, sensor]) => {
                checkSensor(
                    rack.label,
                    type,
                    sensor,
                    prevStatuses.current,
                    newNotifs
                );
            });
        });

        // Check room sensors
        checkSensor(
            "Room",
            "roomTemp",
            data.room.temperature,
            prevStatuses.current,
            newNotifs
        );
        checkSensor(
            "Room",
            "roomHumidity",
            data.room.humidity,
            prevStatuses.current,
            newNotifs
        );

        if (newNotifs.length > 0) {
            setNotifications((prev) =>
                [...newNotifs, ...prev].slice(0, MAX_NOTIFICATIONS)
            );
        }
    }, [data]);

    const unreadCount = Math.max(0, notifications.length - readCount);

    const markAllRead = useCallback(() => {
        setReadCount(notifications.length);
    }, [notifications.length]);

    const clearAll = useCallback(() => {
        setNotifications([]);
        setReadCount(0);
    }, []);

    return { notifications, unreadCount, markAllRead, clearAll };
}
