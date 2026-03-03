"""
Threshold configuration — mirrors the frontend thresholds.ts.
Used by the API to compute sensor status (Normal, Low, High, Critical).
"""

THRESHOLDS: dict[str, dict] = {
    "temperature": {  # room temperature
        "warning_low": 24,
        "warning_high": 30,
        "critical_low": 20,
        "critical_high": 35,
    },
    "humidity": {  # room humidity
        "warning_low": 50,
        "warning_high": 70,
        "critical_low": 40,
        "critical_high": 80,
    },
    "ph": {
        "warning_low": 5.5,
        "warning_high": 6.5,
        "critical_low": 4.5,
        "critical_high": 7.5,
    },
    "ec": {
        "warning_low": 1.0,
        "warning_high": 2.5,
        "critical_low": 0.5,
        "critical_high": 3.0,
    },
    "water_temp": {
        "warning_low": 18,
        "warning_high": 28,
        "critical_low": 15,
        "critical_high": 32,
    },
    "water_level": {
        "warning_low": 30,
        "critical_low": 15,
    },
    "water_flow": {
        "warning_low": 1.0,
        "critical_low": 0.2,
    },
    "light_intensity": {
        "warning_low": 10000,
        "warning_high": 40000,
        "critical_low": 5000,
        "critical_high": 45000,
    },
}


def get_status(value: float, sensor_type: str) -> str:
    """Return status string for a sensor value."""
    t = THRESHOLDS.get(sensor_type)
    if not t:
        return "Normal"

    if "critical_low" in t and value <= t["critical_low"]:
        return "Critical"
    if "critical_high" in t and value >= t["critical_high"]:
        return "Critical"
    if "warning_low" in t and value < t["warning_low"]:
        return "Low"
    if "warning_high" in t and value > t["warning_high"]:
        return "High"
    return "Normal"
