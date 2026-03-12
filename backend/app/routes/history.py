"""
History API routes — time-series data for rack sensors.
GET /api/rack/{id}/history — sensor readings over time range.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import asc
from pydantic import BaseModel

from ..database import get_db
from ..models import SensorReading

router = APIRouter(prefix="/api", tags=["history"])

TIME_RANGES = {"1h": 1, "6h": 6, "24h": 24, "7d": 168}


class DataPoint(BaseModel):
    timestamp: datetime
    value: float


class SensorHistory(BaseModel):
    sensor_type: str
    label: str
    unit: str
    data: list[DataPoint]


class RackHistoryResponse(BaseModel):
    rack_id: int
    rack_label: str
    time_range: str
    sensors: list[SensorHistory]


SENSOR_META = {
    "ph": {"label": "pH Level", "unit": "pH"},
    "ec": {"label": "Nutrisi (EC)", "unit": "mS/cm"},
    "water_temp": {"label": "Suhu Air", "unit": "°C"},
    "water_level": {"label": "Level Air", "unit": "%"},
    "water_flow": {"label": "Aliran Air", "unit": "L/min"},
    "light_intensity": {"label": "Intensitas Cahaya", "unit": "lux"},
}


@router.get("/rack/{rack_id}/history", response_model=RackHistoryResponse)
def get_rack_history(
    rack_id: int,
    range: str = Query("1h", description="Time range: 1h, 6h, 24h, 7d"),
    sensor: Optional[str] = Query(None, description="Filter by sensor type"),
    db: Session = Depends(get_db),
):
    """Get time-series data for a rack's sensors."""
    device_id = f"rack_{rack_id}"
    hours = TIME_RANGES.get(range, 1)
    since = datetime.now(timezone.utc) - timedelta(hours=hours)

    sensor_types = [sensor] if sensor and sensor in SENSOR_META else list(SENSOR_META.keys())

    sensors = []
    for sensor_type in sensor_types:
        readings = (
            db.query(SensorReading)
            .filter(
                SensorReading.device_id == device_id,
                SensorReading.sensor_type == sensor_type,
                SensorReading.timestamp >= since,
            )
            .order_by(asc(SensorReading.timestamp))
            .all()
        )

        meta = SENSOR_META[sensor_type]
        sensors.append(SensorHistory(
            sensor_type=sensor_type,
            label=meta["label"],
            unit=meta["unit"],
            data=[DataPoint(timestamp=r.timestamp, value=r.value) for r in readings],
        ))

    return RackHistoryResponse(
        rack_id=rack_id,
        rack_label=f"Rack {rack_id}",
        time_range=range,
        sensors=sensors,
    )
