"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useRackHistory, TimeRange } from "@/lib/useRackHistory";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "1h", label: "1 Jam" },
  { value: "6h", label: "6 Jam" },
  { value: "24h", label: "24 Jam" },
  { value: "7d", label: "7 Hari" },
];

const SENSOR_COLORS: Record<string, string> = {
  ph: "#10b981", ec: "#3b82f6", water_temp: "#f59e0b",
  water_level: "#06b6d4", water_flow: "#8b5cf6", light_intensity: "#f97316",
};

function formatTime(timestamp: string, range: TimeRange) {
  const date = new Date(timestamp);
  if (range === "7d") return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function SensorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<TimeRange>("1h");
  const rackId = params.id as string;
  const sensorType = params.sensor as string;

  const { data, loading, error } = useRackHistory(parseInt(rackId), timeRange, sensorType);
  const sensor = data?.sensors?.[0];
  const color = SENSOR_COLORS[sensorType] || "#10b981";

  const chartData = sensor?.data.map((d) => ({
    time: formatTime(d.timestamp, timeRange),
    value: d.value,
    fullTime: new Date(d.timestamp).toLocaleString("id-ID"),
  })) || [];

  const values = sensor?.data.map((d) => d.value) || [];
  const min = values.length > 0 ? Math.min(...values) : 0;
  const max = values.length > 0 ? Math.max(...values) : 0;
  const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const latest = values.length > 0 ? values[values.length - 1] : 0;

  function fmt(v: number) {
    if (sensorType === "light_intensity") return Math.round(v).toLocaleString();
    if (sensorType === "ph" || sensorType === "ec") return v.toFixed(2);
    return v.toFixed(1);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border px-6 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push(`/rack/${rackId}`)} className="gap-1">
              <ArrowLeft className="size-4" /> Rack {rackId}
            </Button>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-lg font-bold">{sensor?.label || sensorType}</h1>
            {sensor && <Badge variant="outline" className="text-xs font-mono">{sensor.unit}</Badge>}
          </div>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
            {TIME_RANGES.map((tr) => (
              <Button key={tr.value} variant={timeRange === tr.value ? "default" : "ghost"} size="xs"
                onClick={() => setTimeRange(tr.value)}
                className={timeRange === tr.value ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "text-muted-foreground hover:text-foreground"}>
                {tr.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        {loading && !data ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm text-muted-foreground ml-3">Memuat data...</span>
          </div>
        ) : error ? (
          <div className="text-center py-20 text-red-500">{error}</div>
        ) : sensor ? (
          <>
            <div className="grid grid-cols-4 gap-3 mb-6">
              {[
                { label: "Saat Ini", value: fmt(latest), accent: true },
                { label: "Rata-rata", value: fmt(avg) },
                { label: "Minimum", value: fmt(min) },
                { label: "Maksimum", value: fmt(max) },
              ].map((stat) => (
                <div key={stat.label} className={`bg-card border rounded-xl p-4 text-center ${stat.accent ? "border-emerald-500/50" : "border-border"}`}>
                  <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                  <p className={`text-xl font-bold font-mono ${stat.accent ? "text-emerald-400" : ""}`}>{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground">{sensor.unit}</p>
                </div>
              ))}
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <div className="h-[400px]">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                      <defs>
                        <linearGradient id="sensorGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="time" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={50} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTime || ""} />
                      <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill="url(#sensorGrad)" dot={false} activeDot={{ r: 5, fill: color }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">Belum ada data</div>
                )}
              </div>
              <div className="mt-3 text-right text-xs text-muted-foreground">{chartData.length} data points</div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
