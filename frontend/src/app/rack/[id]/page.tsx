"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useRackHistory, TimeRange, SensorHistory } from "@/lib/useRackHistory";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Droplets, Thermometer, Sun, Gauge,
  Waves, FlaskConical, Maximize2
} from "lucide-react";

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "1h", label: "1 Jam" },
  { value: "6h", label: "6 Jam" },
  { value: "24h", label: "24 Jam" },
  { value: "7d", label: "7 Hari" },
];

const SENSOR_COLORS: Record<string, string> = {
  ph: "#10b981",
  ec: "#3b82f6",
  water_temp: "#f59e0b",
  water_level: "#06b6d4",
  water_flow: "#8b5cf6",
  light_intensity: "#f97316",
};

const SENSOR_ICONS: Record<string, React.ReactNode> = {
  ph: <FlaskConical className="size-4" />,
  ec: <Gauge className="size-4" />,
  water_temp: <Thermometer className="size-4" />,
  water_level: <Droplets className="size-4" />,
  water_flow: <Waves className="size-4" />,
  light_intensity: <Sun className="size-4" />,
};

function formatTime(timestamp: string, range: TimeRange) {
  const date = new Date(timestamp);
  if (range === "7d") {
    return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
  }
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function SensorChart({
  sensor, timeRange, rackId, compact = false,
}: {
  sensor: SensorHistory; timeRange: TimeRange; rackId: string; compact?: boolean;
}) {
  const color = SENSOR_COLORS[sensor.sensor_type] || "#10b981";
  const icon = SENSOR_ICONS[sensor.sensor_type];
  const latestValue = sensor.data.length > 0
    ? sensor.data[sensor.data.length - 1].value : null;

  const chartData = sensor.data.map((d) => ({
    time: formatTime(d.timestamp, timeRange),
    value: d.value,
    fullTime: new Date(d.timestamp).toLocaleString("id-ID"),
  }));

  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:border-emerald-500/30 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${color}20` }}>
            <span style={{ color }}>{icon}</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{sensor.label}</h3>
            <p className="text-xs text-muted-foreground">{sensor.unit}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {latestValue !== null && (
            <Badge variant="outline" className="text-xs font-mono">
              {sensor.sensor_type === "light_intensity"
                ? Math.round(latestValue).toLocaleString()
                : latestValue.toFixed(sensor.sensor_type === "ph" || sensor.sensor_type === "ec" ? 2 : 1)}{" "}
              {sensor.unit}
            </Badge>
          )}
          {compact && (
            <Link href={`/rack/${rackId}/${sensor.sensor_type}`}>
              <Button variant="ghost" size="icon-xs" className="text-muted-foreground hover:text-foreground">
                <Maximize2 className="size-3" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className={compact ? "h-[120px]" : "h-[250px]"}>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
              <defs>
                <linearGradient id={`grad-${sensor.sensor_type}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={40} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTime || ""}
              />
              <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#grad-${sensor.sensor_type})`} dot={false} activeDot={{ r: 4, fill: color }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            Belum ada data untuk rentang waktu ini
          </div>
        )}
      </div>
      <div className="mt-2 text-right">
        <span className="text-[10px] text-muted-foreground">{chartData.length} data points</span>
      </div>
    </div>
  );
}

export default function RackDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<TimeRange>("1h");
  const rackId = params.id as string;

  const { data, loading, error } = useRackHistory(parseInt(rackId), timeRange);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="gap-1">
              <ArrowLeft className="size-4" /> Dashboard
            </Button>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-lg font-bold">{data?.rack_label || `Rack ${rackId}`}</h1>
            <Badge variant="outline" className="text-xs">Time Series</Badge>
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
            {TIME_RANGES.map((tr) => (
              <Button
                key={tr.value}
                variant={timeRange === tr.value ? "default" : "ghost"}
                size="xs"
                onClick={() => setTimeRange(tr.value)}
                className={timeRange === tr.value
                  ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                  : "text-muted-foreground hover:text-foreground"}
              >
                {tr.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {loading && !data ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm text-muted-foreground ml-3">Memuat data...</span>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-500">{error}</p>
            <p className="text-muted-foreground text-sm mt-2">Pastikan backend sedang berjalan</p>
          </div>
        ) : data ? (
          <div className="grid grid-cols-2 gap-4">
            {data.sensors.map((sensor) => (
              <SensorChart key={sensor.sensor_type} sensor={sensor} timeRange={timeRange} rackId={rackId} compact={true} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
