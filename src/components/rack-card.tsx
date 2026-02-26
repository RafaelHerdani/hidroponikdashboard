"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Gauge,
    Zap,
    Waves,
    Sun,
    AlertTriangle,
    Droplets,
    Thermometer,
    Activity,
    Circle,
    TrendingUp,
} from "lucide-react";
import type { RackData, SensorData } from "@/lib/simulation";
import {
    getStatusColor,
    getStatusBg,
    getStatusDot,
    getProgressColor,
    THRESHOLDS,
} from "@/lib/thresholds";
import type { Status } from "@/lib/thresholds";
import { MiniChart } from "./mini-chart";

/** Calculate real trend % from sensor history (recent avg vs older avg) */
function calcTrend(sensor: SensorData): number {
    const h = sensor.history;
    if (h.length < 10) return 0;
    const recentSlice = h.slice(-5);
    const olderSlice = h.slice(-10, -5);
    const recentAvg = recentSlice.reduce((a, b) => a + b, 0) / recentSlice.length;
    const olderAvg = olderSlice.reduce((a, b) => a + b, 0) / olderSlice.length;
    if (olderAvg === 0) return 0;
    return Math.round(((recentAvg - olderAvg) / olderAvg) * 100);
}

interface RackCardProps {
    rack: RackData;
}

interface SensorCardProps {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: number;
    unit: string;
    status: Status;
    decimals: number;
    type: string;
    tooltip: string;
    trend?: number;
    variant?: "default" | "inverted";
}

function SensorCard({
    icon: Icon,
    label,
    value,
    unit,
    status,
    decimals,
    type,
    tooltip,
    trend,
    variant = "default",
}: SensorCardProps) {
    const config = THRESHOLDS[type];
    const progressPercent = config
        ? ((value - config.min) / (config.max - config.min)) * 100
        : 50;
    const isInverted = variant === "inverted";

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="group cursor-pointer">
                    <div className={`relative rounded-xl p-3 border-2 transition-all duration-200 hover:shadow-lg ${isInverted
                        ? "bg-gray-900 dark:bg-gray-950 border-gray-700 hover:border-gray-600 dark:hover:border-gray-700"
                        : "bg-white dark:bg-gray-950 hover:border-gray-300 dark:hover:border-gray-700"
                        }`}>
                        {/* Header */}
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                                <div className={`p-1.5 rounded-lg ${getStatusBg(status)}/10`}>
                                    <Icon className={`w-3.5 h-3.5 ${getStatusColor(status)}`} />
                                </div>
                                <span className={`text-xs font-medium ${isInverted ? "text-gray-300 dark:text-gray-400" : "text-gray-500 dark:text-gray-400"}`}>
                                    {label}
                                </span>
                            </div>
                            <div className={`px-1.5 py-0.5 rounded-full text-[9px] font-medium border ${getStatusBg(status)}/20 ${getStatusColor(status)} border-current/20`}>
                                {status}
                            </div>
                        </div>

                        {/* Value */}
                        <div className="flex items-baseline gap-1 mb-1">
                            <span className={`text-xl font-bold tabular-nums ${getStatusColor(status)}`}>
                                {value.toFixed(decimals)}
                            </span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                {unit}
                            </span>
                            {trend !== undefined && trend !== 0 && (
                                <div className={`ml-auto flex items-center gap-0.5 text-[10px] font-medium ${trend > 0 ? 'text-emerald-600' : 'text-rose-600'
                                    }`}>
                                    <TrendingUp className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
                                    <span>{Math.abs(trend)}%</span>
                                </div>
                            )}
                        </div>

                        {/* Progress Bar */}
                        <div className={`relative h-1.5 rounded-full overflow-hidden ${isInverted ? "bg-gray-800 dark:bg-gray-800" : "bg-gray-100 dark:bg-gray-800"}`}>
                            <div
                                className={`absolute inset-y-0 left-0 transition-all duration-500 rounded-full ${getProgressColor(status)}`}
                                style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                            />
                        </div>
                    </div>
                </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px]">
                <p className="font-medium text-xs">{tooltip}</p>
            </TooltipContent>
        </Tooltip>
    );
}

export function RackCard({ rack }: RackCardProps) {
    const borderColors = {
        Critical: "border-rose-200 dark:border-rose-950",
        Warning: "border-amber-200 dark:border-amber-950",
        Normal: "border-gray-200 dark:border-gray-800",
    };

    const statusBadgeColors = {
        Critical: "bg-rose-950/30 text-rose-400 border-rose-800",
        Warning: "bg-amber-950/30 text-amber-400 border-amber-800",
        Normal: "bg-emerald-950/30 text-emerald-400 border-emerald-800",
    };

    return (
        <Card className={`relative overflow-hidden bg-white dark:bg-gray-950 border-2 ${borderColors[rack.overallStatus]} transition-all duration-200 hover:shadow-xl pt-1`}>
            {/* Simple decorative line based on status */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${rack.overallStatus === 'Critical' ? 'bg-rose-500' :
                rack.overallStatus === 'Warning' ? 'bg-amber-500' :
                    'bg-black'
                }`} />

            <CardContent className="relative p-4 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between p-3 mb-3 rounded-lg border-2 border-gray-700 dark:border-gray-700 bg-gray-900 dark:bg-gray-900/50">
                    <div className="flex items-center gap-3">
                        <div>
                            <h3 className="text-lg font-bold text-gray-100 dark:text-gray-100">{rack.label}</h3>
                        </div>
                    </div>
                    <Badge
                        variant="outline"
                        className={`px-2 py-0.5 text-xs font-semibold border-2 ${statusBadgeColors[rack.overallStatus]}`}
                    >
                        {rack.overallStatus}
                    </Badge>
                </div>

                {/* Tank Section - Bento Grid */}
                <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 flex items-center gap-2">
                        <Circle className="w-1.5 h-1.5 fill-current" />
                        Tank Sensors
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                        <SensorCard
                            icon={Droplets}
                            label="Water Level"
                            value={rack.waterLevel.value}
                            unit="%"
                            status={rack.waterLevel.status}
                            decimals={0}
                            type="waterLevel"
                            tooltip="Tank water level — Warning: <30%, Critical: <15%"
                            trend={calcTrend(rack.waterLevel)}
                        />
                        <SensorCard
                            icon={Gauge}
                            label="Water pH Level"
                            value={rack.ph.value}
                            unit="pH"
                            status={rack.ph.status}
                            decimals={2}
                            type="ph"
                            tooltip="Water pH level — optimal for hydroponics: 5.5–6.5"
                            trend={calcTrend(rack.ph)}
                        />
                        <SensorCard
                            icon={Zap}
                            label="Nutrition in Water"
                            value={rack.ec.value}
                            unit="mS/cm"
                            status={rack.ec.status}
                            decimals={2}
                            type="ec"
                            tooltip="nutrient concentration"
                            trend={calcTrend(rack.ec)}
                        />
                        <SensorCard
                            icon={Thermometer}
                            label="Water Temp"
                            value={rack.waterTemp.value}
                            unit="°C"
                            status={rack.waterTemp.status}
                            decimals={1}
                            type="waterTemp"
                            tooltip="Water temperature — optimal: 18–28°C"
                            trend={calcTrend(rack.waterTemp)}
                        />
                    </div>
                </div>

                {/* On Rack Section */}
                <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 flex items-center gap-2">
                        <Circle className="w-1.5 h-1.5 fill-current" />
                        On Rack Sensors
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                        <SensorCard
                            icon={Sun}
                            label="Light"
                            value={rack.lightIntensity.value}
                            unit="lux"
                            status={rack.lightIntensity.status}
                            decimals={0}
                            type="lightIntensity"
                            tooltip="LED grow light intensity"
                            trend={calcTrend(rack.lightIntensity)}
                            variant="inverted"
                        />
                    </div>
                </div>

                {/* Flow Chart & Alerts */}
                <div className="space-y-3">
                    {/* Pump failure warning */}
                    {rack.waterFlow.value < 0.2 && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-200 dark:border-rose-800">
                            <AlertTriangle className="w-4 h-4 text-rose-500" />
                            <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
                                Pump Failure Detected — Immediate action required!
                            </span>
                        </div>
                    )}

                    {/* Water Flow Chart */}
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 border-2 border-gray-200 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <div className="p-1 rounded-lg bg-gray-100 dark:bg-gray-800">
                                    <TrendingUp className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />
                                </div>
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Water Flow</span>
                                <Badge
                                    variant="outline"
                                    className={`px-1.5 py-0 text-[10px] font-medium ${getStatusBg(rack.waterFlow.status)}/10 ${getStatusColor(rack.waterFlow.status)} border-current/20`}
                                >
                                    {rack.waterFlow.status}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400 dark:text-gray-500">Current:</span>
                                <span className={`text-sm font-bold tabular-nums ${getStatusColor(rack.waterFlow.status)}`}>
                                    {rack.waterFlow.value.toFixed(1)} L/min
                                </span>
                            </div>
                        </div>
                        <div className="h-12">
                            <MiniChart
                                data={rack.waterFlow.history}
                                status={rack.waterFlow.status}
                            />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}