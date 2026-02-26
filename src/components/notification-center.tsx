"use client";

import { useState } from "react";
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Bell,
    AlertTriangle,
    XCircle,
    CheckCheck,
    Trash2,
    Info,
} from "lucide-react";
import type { Notification } from "@/lib/notifications";

interface NotificationCenterProps {
    notifications: Notification[];
    unreadCount: number;
    onMarkAllRead: () => void;
    onClearAll: () => void;
    collapsed?: boolean;
}

function getStatusIcon(status: string) {
    if (status === "Critical") return <XCircle className="w-4 h-4 text-red-500" />;
    return <AlertTriangle className="w-4 h-4 text-amber-500" />;
}

function getStatusBadgeClass(status: string) {
    if (status === "Critical")
        return "bg-red-500/15 text-red-500 border-red-500/30";
    return "bg-amber-500/15 text-amber-500 border-amber-500/30";
}

function formatTime(date: Date) {
    return date.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

export function NotificationCenter({
    notifications,
    unreadCount,
    onMarkAllRead,
    onClearAll,
    collapsed = false,
}: NotificationCenterProps) {
    const [open, setOpen] = useState(false);

    return (
        <Drawer direction="right" open={open} onOpenChange={setOpen}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DrawerTrigger asChild>
                        <button
                            className="relative flex items-center justify-center w-8 h-8 rounded-md bg-gray-800 dark:bg-muted/50 hover:bg-gray-700 dark:hover:bg-muted transition-colors"
                        >
                            <Bell className="w-4 h-4" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold leading-none animate-pulse">
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                            )}
                        </button>
                    </DrawerTrigger>
                </TooltipTrigger>
                <TooltipContent>Pusat Notifikasi</TooltipContent>
            </Tooltip>

            <DrawerContent className="h-full">
                <div className="flex flex-col h-full w-full">
                    <DrawerHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <DrawerTitle className="text-lg">Pusat Notifikasi</DrawerTitle>
                                {notifications.length > 0 && (
                                    <Badge
                                        variant="outline"
                                        className="text-xs bg-muted/50"
                                    >
                                        {notifications.length} log
                                    </Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={onMarkAllRead}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-muted/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                    >
                                        <CheckCheck className="w-3.5 h-3.5" />
                                        Tandai dibaca
                                    </button>
                                )}
                                {notifications.length > 0 && (
                                    <button
                                        onClick={onClearAll}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-muted/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Hapus semua
                                    </button>
                                )}
                            </div>
                        </div>
                        <DrawerDescription className="text-xs text-muted-foreground">
                            Log peringatan sensor dan cara penanganannya
                        </DrawerDescription>
                    </DrawerHeader>

                    {/* Notification List */}
                    <div className="px-4 pb-4 overflow-y-auto flex-1">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="p-4 rounded-full bg-muted/30 mb-4">
                                    <Bell className="w-8 h-8 text-muted-foreground/50" />
                                </div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    Tidak ada notifikasi
                                </p>
                                <p className="text-xs text-muted-foreground/70 mt-1">
                                    Notifikasi akan muncul jika ada sensor dalam kondisi Warning
                                    atau Critical
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {notifications.map((notif, index) => (
                                    <div
                                        key={notif.id}
                                        className={`group relative rounded-xl border p-3.5 transition-all duration-200 hover:shadow-md ${index < unreadCount
                                            ? "bg-muted/30 border-border/80"
                                            : "bg-background border-border/40 opacity-70"
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Status Icon */}
                                            <div
                                                className={`flex-shrink-0 mt-0.5 p-1.5 rounded-lg ${notif.status === "Critical"
                                                    ? "bg-red-500/10"
                                                    : "bg-amber-500/10"
                                                    }`}
                                            >
                                                {getStatusIcon(notif.status)}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-bold">
                                                        {notif.rackLabel}
                                                    </span>
                                                    <span className="text-muted-foreground text-xs">
                                                        •
                                                    </span>
                                                    <span className="text-xs font-medium text-muted-foreground">
                                                        {notif.sensorLabel}
                                                    </span>
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-[10px] px-1.5 py-0 font-medium ${getStatusBadgeClass(
                                                            notif.status
                                                        )}`}
                                                    >
                                                        {notif.status}
                                                    </Badge>
                                                </div>

                                                {/* Value */}
                                                <p className="text-sm font-semibold tabular-nums mb-1.5">
                                                    {notif.value.toFixed(
                                                        notif.sensorType === "ph" || notif.sensorType === "ec"
                                                            ? 2
                                                            : notif.sensorType === "lightIntensity" ||
                                                                notif.sensorType === "waterLevel"
                                                                ? 0
                                                                : 1
                                                    )}{" "}
                                                    <span className="text-xs font-normal text-muted-foreground">
                                                        {notif.unit}
                                                    </span>
                                                </p>

                                                {/* Remediation */}
                                                <div className="flex items-start gap-1.5 p-2 rounded-lg bg-muted/40 border border-border/30">
                                                    <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
                                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                                        <span className="font-semibold text-foreground/80">
                                                            Penanganan:{" "}
                                                        </span>
                                                        {notif.message}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Timestamp */}
                                            <span className="text-[10px] text-muted-foreground/70 font-mono flex-shrink-0 tabular-nums">
                                                {formatTime(notif.timestamp)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
}
