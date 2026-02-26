"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import type { Status } from "@/lib/thresholds";

interface MiniChartProps {
    data: number[];
    status: Status;
}

function getChartColor(status: Status): string {
    switch (status) {
        case "Normal":
            return "#10b981";
        case "Low":
        case "High":
        case "Warning":
            return "#f59e0b";
        case "Critical":
            return "#ef4444";
    }
}

export function MiniChart({ data, status }: MiniChartProps) {
    const color = getChartColor(status);
    const chartData = data.map((value, index) => ({ index, value }));

    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={color} stopOpacity={0.0} />
                    </linearGradient>
                </defs>
                <Area
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={1.5}
                    fill={`url(#gradient-${color})`}
                    dot={false}
                    isAnimationActive={false}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
