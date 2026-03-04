"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SensorData } from "@/lib/simulation";
import { getStatusBg, getStatusColor, THRESHOLDS } from "@/lib/thresholds";
import { Thermometer, Droplets } from "lucide-react";
import { MiniChart } from "./mini-chart";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface RoomMonitorProps {
    temperature: SensorData;
    humidity: SensorData;
}

function RoomSensor({
    sensor,
    type,
    icon: Icon,
    variant = "default",
}: {
    sensor: SensorData;
    type: string;
    icon: React.ComponentType<{ className?: string }>;
    variant?: "default" | "inverted";
}) {
    const config = THRESHOLDS[type];
    const isInverted = variant === "inverted";

    return (
        <Card className={`py-3.5 gap-0 h-full ${isInverted ? "bg-gray-900 border-gray-700 dark:bg-card/60 dark:border-border/50" : "bg-card/60 border-border/50"}`}>
            <CardContent className="px-4 py-0">
                <div className="flex items-start justify-between mb-1.5">
                    <div className="flex items-center gap-2.5">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-md ${isInverted ? "bg-gray-800 dark:bg-muted/60" : "bg-muted/60"}`}>
                            <Icon className={`w-5 h-5 ${getStatusColor(sensor.status)}`} />
                        </div>
                        <div>
                            <p className={`text-xs leading-tight ${isInverted ? "text-gray-400 dark:text-muted-foreground" : "text-muted-foreground"}`}>
                                Room {config.label}
                            </p>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-baseline gap-1.5">
                                        <span
                                            className={`text-3xl font-bold tabular-nums leading-none transition-all duration-500 ${getStatusColor(
                                                sensor.status
                                            )}`}
                                        >
                                            {sensor.value.toFixed(config.decimals ?? 1)}
                                        </span>
                                        <span className={`text-sm ${isInverted ? "text-gray-400 dark:text-muted-foreground" : "text-muted-foreground"}`}>
                                            {config.unit}
                                        </span>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    {config.label}: {sensor.value.toFixed(config.decimals ?? 1)}
                                    {config.unit} — Range: {config.warningLow}–{config.warningHigh}
                                    {config.unit}
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </div>
                    <Badge
                        variant="outline"
                        className={`text-xs px-2 py-0 h-5 ${getStatusBg(sensor.status)}`}
                    >
                        {sensor.status}
                    </Badge>
                </div>
                <div className="h-12 mt-1">
                    <MiniChart data={sensor.history} status={sensor.status} />
                </div>
            </CardContent>
        </Card>
    );
}

export function RoomMonitor({ temperature, humidity }: RoomMonitorProps) {
    return (
        <div className="grid grid-cols-2 gap-3 h-full">
            <RoomSensor sensor={temperature} type="roomTemp" icon={Thermometer} variant="inverted" />
            <RoomSensor sensor={humidity} type="roomHumidity" icon={Droplets} />
        </div>
    );
}
