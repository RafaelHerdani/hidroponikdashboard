"use client";

import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { getStatusColor, getStatusBg, THRESHOLDS } from "@/lib/thresholds";
import type { Status } from "@/lib/thresholds";

interface WaterTankProps {
    level: number;
    status: Status;
}

export function WaterTank({ level, status }: WaterTankProps) {
    const config = THRESHOLDS.waterLevel;
    const fillColor =
        status === "Critical"
            ? "bg-red-500"
            : status === "Normal"
                ? "bg-emerald-500"
                : "bg-amber-500";

    const fillGlow =
        status === "Critical"
            ? "shadow-[0_0_10px_rgba(239,68,68,0.3)]"
            : status === "Normal"
                ? "shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                : "shadow-[0_0_10px_rgba(245,158,11,0.3)]";

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">Water</span>
                    <div
                        className={`relative w-8 h-16 rounded-md border border-border/60 bg-muted/30 overflow-hidden ${fillGlow}`}
                    >
                        <div
                            className={`absolute bottom-0 left-0 right-0 ${fillColor} transition-all duration-700 ease-out rounded-b-sm`}
                            style={{ height: `${Math.max(level, 2)}%` }}
                        />
                        {/* Water line markers */}
                        <div className="absolute inset-0 flex flex-col justify-between py-1 px-0.5">
                            {[75, 50, 25].map((mark) => (
                                <div key={mark} className="w-full h-px bg-border/30" />
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <span
                            className={`text-xs font-bold tabular-nums transition-all duration-500 ${getStatusColor(
                                status
                            )}`}
                        >
                            {Math.round(level)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{config.unit}</span>
                    </div>
                    <span
                        className={`text-[9px] px-1.5 py-0 rounded-full border ${getStatusBg(status)}`}
                    >
                        {status}
                    </span>
                </div>
            </TooltipTrigger>
            <TooltipContent>
                <p className="font-medium">{config.label}</p>
                <p className="text-xs text-muted-foreground">
                    Current: {Math.round(level)}% — Warning: &lt;30%, Critical: &lt;15%
                </p>
            </TooltipContent>
        </Tooltip>
    );
}
