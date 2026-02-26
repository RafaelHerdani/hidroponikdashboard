export type Status = "Normal" | "Low" | "High" | "Warning" | "Critical";

export interface ThresholdConfig {
  min: number;
  max: number;
  warningLow?: number;
  warningHigh?: number;
  criticalLow?: number;
  criticalHigh?: number;
  unit: string;
  label: string;
  decimals?: number;
}

export const THRESHOLDS: Record<string, ThresholdConfig> = {
  roomTemp: {
    min: 20,
    max: 40,
    warningLow: 24,
    warningHigh: 30,
    criticalLow: 20,
    criticalHigh: 35,
    unit: "°C",
    label: "Temperature",
    decimals: 1,
  },
  roomHumidity: {
    min: 30,
    max: 90,
    warningLow: 50,
    warningHigh: 70,
    criticalLow: 40,
    criticalHigh: 80,
    unit: "%",
    label: "Humidity",
    decimals: 1,
  },
  waterTemp: {
    min: 15,
    max: 35,
    warningLow: 18,
    warningHigh: 28,
    criticalLow: 15,
    criticalHigh: 32,
    unit: "°C",
    label: "Water Temp",
    decimals: 1,
  },
  waterLevel: {
    min: 0,
    max: 100,
    warningLow: 30,
    criticalLow: 15,
    unit: "%",
    label: "Water Level",
    decimals: 0,
  },
  ph: {
    min: 0,
    max: 14,
    warningLow: 5.5,
    warningHigh: 6.5,
    criticalLow: 4.5,
    criticalHigh: 7.5,
    unit: "",
    label: "pH",
    decimals: 2,
  },
  ec: {
    min: 0,
    max: 3.5,
    warningLow: 1.0,
    warningHigh: 2.5,
    criticalLow: 0.5,
    criticalHigh: 3.0,
    unit: "mS/cm",
    label: "Nutrition",
    decimals: 2,
  },
  waterFlow: {
    min: 0,
    max: 10,
    warningLow: 1.0,
    criticalLow: 0.2,
    unit: "L/min",
    label: "Water Flow",
    decimals: 1,
  },
  lightIntensity: {
    min: 0,
    max: 50000,
    warningLow: 10000,
    warningHigh: 40000,
    criticalLow: 5000,
    criticalHigh: 45000,
    unit: "lux",
    label: "Light Intensity",
    decimals: 0,
  },
};

export function getStatus(value: number, type: string): Status {
  const t = THRESHOLDS[type];
  if (!t) return "Normal";

  if (t.criticalLow !== undefined && value <= t.criticalLow) return "Critical";
  if (t.criticalHigh !== undefined && value >= t.criticalHigh) return "Critical";
  if (t.warningLow !== undefined && value < t.warningLow) return "Low";
  if (t.warningHigh !== undefined && value > t.warningHigh) return "High";
  return "Normal";
}

export function getStatusColor(status: Status): string {
  switch (status) {
    case "Normal":
      return "text-emerald-500";
    case "Low":
    case "High":
    case "Warning":
      return "text-amber-500";
    case "Critical":
      return "text-red-500";
  }
}

export function getStatusBg(status: Status): string {
  switch (status) {
    case "Normal":
      return "bg-emerald-500/15 text-emerald-500 border-emerald-500/30";
    case "Low":
    case "High":
    case "Warning":
      return "bg-amber-500/15 text-amber-500 border-amber-500/30";
    case "Critical":
      return "bg-red-500/15 text-red-500 border-red-500/30";
  }
}

export function getStatusDot(status: Status): string {
  switch (status) {
    case "Normal":
      return "bg-emerald-500";
    case "Low":
    case "High":
    case "Warning":
      return "bg-amber-500";
    case "Critical":
      return "bg-red-500 animate-pulse";
  }
}

export function getWorstStatus(statuses: Status[]): Status {
  if (statuses.includes("Critical")) return "Critical";
  if (statuses.includes("High") || statuses.includes("Low") || statuses.includes("Warning"))
    return "Warning";
  return "Normal";
}

export function getProgressColor(status: Status): string {
  switch (status) {
    case "Normal":
      return "[&>div]:bg-emerald-500";
    case "Low":
    case "High":
    case "Warning":
      return "[&>div]:bg-amber-500";
    case "Critical":
      return "[&>div]:bg-red-500";
  }
}
