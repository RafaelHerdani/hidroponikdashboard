"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  useReactTable, getCoreRowModel, flexRender,
  createColumnHelper, type ColumnDef,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Download, ChevronLeft, ChevronRight,
  Database, RefreshCw, LogOut
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ReadingRow {
  id: number;
  device_id: string;
  sensor_type: string;
  value: number;
  timestamp: string;
}

interface PaginatedData {
  data: ReadingRow[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const DEVICES = ["", "room", "rack_1", "rack_2", "rack_3", "rack_4", "rack_5"];
const SENSORS = ["", "temperature", "humidity", "ph", "ec", "water_temp", "water_level", "water_flow", "light_intensity"];

const DEVICE_LABELS: Record<string, string> = {
  room: "Room", rack_1: "Rack 1", rack_2: "Rack 2",
  rack_3: "Rack 3", rack_4: "Rack 4", rack_5: "Rack 5",
};

const SENSOR_LABELS: Record<string, string> = {
  temperature: "Temperature", humidity: "Humidity",
  ph: "pH", ec: "EC (Nutrisi)", water_temp: "Suhu Air",
  water_level: "Level Air", water_flow: "Aliran Air",
  light_intensity: "Cahaya",
};

function formatTimestamp(ts: string) {
  return new Date(ts).toLocaleString("id-ID", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export default function DataPage() {
  const router = useRouter();
  const [tableData, setTableData] = useState<PaginatedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [device, setDevice] = useState("");
  const [sensor, setSensor] = useState("");

  // Auth check
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (device) params.set("device", device);
      if (sensor) params.set("sensor", sensor);

      const res = await fetch(`${API_BASE}/api/readings?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 401) {
        localStorage.removeItem("auth_token");
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const json = await res.json();
      setTableData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, device, sensor]);

  const handleExport = async () => {
    const token = localStorage.getItem("auth_token");
    const params = new URLSearchParams();
    if (device) params.set("device", device);
    if (sensor) params.set("sensor", sensor);

    const res = await fetch(`${API_BASE}/api/readings/export?${params}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sensor_readings.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    router.push("/login");
  };

  const columns = useMemo<ColumnDef<ReadingRow, any>[]>(
    () => [
      {
        accessorKey: "id",
        header: "#",
        cell: (info) => (
          <span className="text-xs text-muted-foreground font-mono">{info.getValue()}</span>
        ),
        size: 60,
      },
      {
        accessorKey: "device_id",
        header: "Device",
        cell: (info) => {
          const val = info.getValue() as string;
          return (
            <Badge variant="outline" className="text-xs font-mono">
              {DEVICE_LABELS[val] || val}
            </Badge>
          );
        },
      },
      {
        accessorKey: "sensor_type",
        header: "Sensor",
        cell: (info) => {
          const val = info.getValue() as string;
          return <span className="text-sm">{SENSOR_LABELS[val] || val}</span>;
        },
      },
      {
        accessorKey: "value",
        header: "Value",
        cell: (info) => (
          <span className="text-sm font-mono font-semibold text-emerald-400">
            {(info.getValue() as number).toFixed(2)}
          </span>
        ),
      },
      {
        accessorKey: "timestamp",
        header: "Timestamp",
        cell: (info) => (
          <span className="text-xs text-muted-foreground">{formatTimestamp(info.getValue() as string)}</span>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: tableData?.data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: tableData?.pages || 1,
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="gap-1">
              <ArrowLeft className="size-4" /> Dashboard
            </Button>
            <div className="h-6 w-px bg-border" />
            <Database className="size-4 text-emerald-500" />
            <h1 className="text-lg font-bold">Database Viewer</h1>
            {tableData && (
              <Badge variant="outline" className="text-xs font-mono">
                {tableData.total.toLocaleString()} records
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} className="gap-1">
              <RefreshCw className="size-3" /> Refresh
            </Button>
            <Button variant="default" size="sm" onClick={handleExport} className="gap-1 bg-emerald-600 hover:bg-emerald-700">
              <Download className="size-3" /> Download CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1 text-muted-foreground">
              <LogOut className="size-3" /> Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Filters */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Device:</label>
            <select
              value={device}
              onChange={(e) => { setDevice(e.target.value); setPage(1); }}
              className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Semua Device</option>
              {DEVICES.filter(Boolean).map((d) => (
                <option key={d} value={d}>{DEVICE_LABELS[d] || d}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Sensor:</label>
            <select
              value={sensor}
              onChange={(e) => { setSensor(e.target.value); setPage(1); }}
              className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Semua Sensor</option>
              {SENSORS.filter(Boolean).map((s) => (
                <option key={s} value={s}>{SENSOR_LABELS[s] || s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b border-border bg-muted/50">
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-sm text-muted-foreground">Memuat data...</span>
                      </div>
                    </td>
                  </tr>
                ) : table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      Tidak ada data
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-2.5">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {tableData && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
              <span className="text-xs text-muted-foreground">
                Halaman {tableData.page} dari {tableData.pages} ({tableData.total.toLocaleString()} total)
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline" size="xs"
                  disabled={page <= 1}
                  onClick={() => setPage(1)}
                >
                  First
                </Button>
                <Button
                  variant="outline" size="xs"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="size-3" />
                </Button>
                <span className="px-3 text-sm font-mono">{page}</span>
                <Button
                  variant="outline" size="xs"
                  disabled={page >= (tableData.pages || 1)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="size-3" />
                </Button>
                <Button
                  variant="outline" size="xs"
                  disabled={page >= (tableData.pages || 1)}
                  onClick={() => setPage(tableData.pages)}
                >
                  Last
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
