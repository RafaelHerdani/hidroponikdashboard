"use client";

import { useState, useEffect, useCallback } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface DataPoint {
  timestamp: string;
  value: number;
}

export interface SensorHistory {
  sensor_type: string;
  label: string;
  unit: string;
  data: DataPoint[];
}

export interface RackHistoryData {
  rack_id: number;
  rack_label: string;
  time_range: string;
  sensors: SensorHistory[];
}

export type TimeRange = "1h" | "6h" | "24h" | "7d";

export function useRackHistory(rackId: number, timeRange: TimeRange, sensor?: string) {
  const [data, setData] = useState<RackHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ range: timeRange });
      if (sensor) params.set("sensor", sensor);

      const res = await fetch(`${API_BASE}/api/rack/${rackId}/history?${params}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch history");
    } finally {
      setLoading(false);
    }
  }, [rackId, timeRange, sensor]);

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 10000);
    return () => clearInterval(interval);
  }, [fetchHistory]);

  return { data, loading, error, refetch: fetchHistory };
}
