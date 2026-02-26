"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    Wifi,
    WifiOff,
    Server,
    ServerOff,
    Activity,
    Sun,
    Moon,
    Leaf,
    ChevronUp,
    ChevronDown,
    TrendingUp,
    TrendingDown,
    Minus,
} from "lucide-react";
import type { SystemStatus, SimulationMode } from "@/lib/simulation";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { NotificationCenter } from "@/components/notification-center";
import type { Notification } from "@/lib/notifications";

interface HeaderProps {
    system: SystemStatus;
    simulationActive: boolean;
    onToggleSimulation: () => void;
    simulationMode: SimulationMode;
    onSetSimulationMode: (mode: SimulationMode) => void;
    warningCount: number;
    criticalCount: number;
    notifications: Notification[];
    unreadCount: number;
    onMarkAllRead: () => void;
    onClearAll: () => void;
}

export function Header({
    system,
    simulationActive,
    onToggleSimulation,
    simulationMode,
    onSetSimulationMode,
    warningCount,
    criticalCount,
    notifications,
    unreadCount,
    onMarkAllRead,
    onClearAll,
}: HeaderProps) {
    const { theme, setTheme } = useTheme();
    const [collapsed, setCollapsed] = useState(false);

    const modeButtons: { mode: SimulationMode; label: string; icon: React.ComponentType<{ className?: string }>; color: string; activeColor: string }[] = [
        { mode: "trending_down", label: "Down", icon: TrendingDown, color: "text-muted-foreground", activeColor: "bg-rose-500/20 text-rose-500 border-rose-500/40" },
        { mode: "stable", label: "Stable", icon: Minus, color: "text-muted-foreground", activeColor: "bg-emerald-500/20 text-emerald-500 border-emerald-500/40" },
        { mode: "trending_up", label: "Up", icon: TrendingUp, color: "text-muted-foreground", activeColor: "bg-amber-500/20 text-amber-500 border-amber-500/40" },
    ];

    return (
        <header className="mx-4 mb-3 rounded-2xl border border-gray-700 dark:border-border bg-gray-900 text-gray-100 dark:bg-card/80 dark:text-foreground backdrop-blur-sm shadow-lg transition-all duration-300 ease-in-out z-10">
            <div className={`relative flex items-center justify-between px-5 transition-all duration-300 ease-in-out ${collapsed ? "py-1.5" : "py-2.5"}`}>

                {/* Center: Status badges — always visible */}
                <div className="flex items-center gap-3">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-800 dark:bg-muted/50">
                                {system.esp32Online ? (
                                    <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                    <WifiOff className="w-3.5 h-3.5 text-red-500" />
                                )}
                                {!collapsed && <span className="text-[11px] font-medium">ESP32</span>}
                                <span
                                    className={`w-1.5 h-1.5 rounded-full ${system.esp32Online ? "bg-emerald-500" : "bg-red-500 animate-pulse"
                                        }`}
                                />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            ESP32 Controller: {system.esp32Online ? "Connected" : "Disconnected"}
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-800 dark:bg-muted/50">
                                {system.serverOnline ? (
                                    <Server className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                    <ServerOff className="w-3.5 h-3.5 text-red-500" />
                                )}
                                {!collapsed && <span className="text-[11px] font-medium">Server</span>}
                                <span
                                    className={`w-1.5 h-1.5 rounded-full ${system.serverOnline
                                        ? "bg-emerald-500"
                                        : "bg-red-500 animate-pulse"
                                        }`}
                                />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            Server: {system.serverOnline ? "Online" : "Offline"}
                        </TooltipContent>
                    </Tooltip>

                    {warningCount > 0 && (
                        <Badge
                            variant="outline"
                            className="bg-amber-500/15 text-amber-500 border-amber-500/30 text-[11px] font-medium"
                        >
                            {warningCount} Warning
                        </Badge>
                    )}
                    {criticalCount > 0 && (
                        <Badge
                            variant="outline"
                            className="bg-red-500/15 text-red-500 border-red-500/30 text-[11px] font-medium animate-pulse"
                        >
                            {criticalCount} Critical
                        </Badge>
                    )}
                </div>

                {/* Title — absolute center */}
                <div className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none">
                    <h1 className={`font-semibold tracking-tight leading-tight transition-all duration-300 ${collapsed ? "text-sm" : "text-base"}`}>
                        Lab Smart Farming
                    </h1>
                    {!collapsed && (
                        <p className="text-[11px] text-gray-400 dark:text-muted-foreground leading-tight">
                            C502
                        </p>
                    )}
                </div>

                {/* Right: Controls */}
                <div className="flex items-center gap-4">
                    {!collapsed && (
                        <div className="text-right mr-2">
                            <span className="text-[10px] text-gray-400 dark:text-muted-foreground block leading-tight">
                                Last Updated
                            </span>
                            <span className="text-[11px] font-mono font-medium leading-tight">
                                {system.lastUpdated.toLocaleTimeString()}
                            </span>
                        </div>
                    )}

                    {!collapsed && (
                        <div className="flex items-center gap-2">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-gray-800 dark:bg-muted/50">
                                        <Activity
                                            className={`w-3.5 h-3.5 ${simulationActive ? "text-emerald-500" : "text-muted-foreground"
                                                }`}
                                        />
                                        <span className="text-[11px] font-medium">Sim</span>
                                        <Switch
                                            checked={simulationActive}
                                            onCheckedChange={onToggleSimulation}
                                            className="scale-75"
                                        />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>Toggle data simulation</TooltipContent>
                            </Tooltip>

                            {/* Simulation Mode Buttons */}
                            {simulationActive && (
                                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-gray-800/50 dark:bg-muted/30 border border-gray-700 dark:border-border/50">
                                    {modeButtons.map(({ mode, label, icon: ModeIcon, activeColor }) => (
                                        <Tooltip key={mode}>
                                            <TooltipTrigger asChild>
                                                <button
                                                    onClick={() => onSetSimulationMode(mode)}
                                                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-200 border ${simulationMode === mode
                                                        ? activeColor
                                                        : "border-transparent text-gray-400 dark:text-muted-foreground hover:bg-gray-700 dark:hover:bg-muted/60 hover:text-gray-100 dark:hover:text-foreground"
                                                        }`}
                                                >
                                                    <ModeIcon className="w-3 h-3" />
                                                    {label}
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                {mode === "stable" ? "Values drift around normal range" :
                                                    mode === "trending_up" ? "Values gradually increase toward warning/critical" :
                                                        "Values gradually decrease toward low warning/critical"}
                                            </TooltipContent>
                                        </Tooltip>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <NotificationCenter
                        notifications={notifications}
                        unreadCount={unreadCount}
                        onMarkAllRead={onMarkAllRead}
                        onClearAll={onClearAll}
                        collapsed={collapsed}
                    />

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                                className="flex items-center justify-center w-8 h-8 rounded-md bg-gray-800 dark:bg-muted/50 hover:bg-gray-700 dark:hover:bg-muted transition-colors"
                            >
                                {theme === "dark" ? (
                                    <Sun className="w-4 h-4" />
                                ) : (
                                    <Moon className="w-4 h-4" />
                                )}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>Toggle theme</TooltipContent>
                    </Tooltip>

                    {/* Collapse toggle */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => setCollapsed(!collapsed)}
                                className="flex items-center justify-center w-8 h-8 rounded-md bg-gray-800 dark:bg-muted/50 hover:bg-gray-700 dark:hover:bg-muted transition-colors"
                            >
                                {collapsed ? (
                                    <ChevronUp className="w-4 h-4" />
                                ) : (
                                    <ChevronDown className="w-4 h-4" />
                                )}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>{collapsed ? "Expand header" : "Collapse header"}</TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </header>
    );
}
