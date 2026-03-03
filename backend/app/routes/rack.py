"""
Rack sensor API routes.
GET /api/racks     — all racks summary
GET /api/rack/{id} — single rack detail with sensor history
"""

from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import SensorReading
from ..schemas import RackResponse, RackSensors, SensorValue
from ..thresholds import get_status

router = APIRouter(prefix="/api", tags=["rack"])

HISTORY_LENGTH = 25
OFFLINE_TIMEOUT = timedelta(seconds=15)
RACK_SENSOR_TYPES = ["ph", "ec", "water_temp", "water_level", "water_flow", "light_intensity"]


def _build_sensor_value(
    db: Session, device_id: str, sensor_type: str
) -> tuple[SensorValue | None, datetime | None]:
    """Query latest value + history for a sensor."""
    readings = (
        db.query(SensorReading)
        .filter(
            SensorReading.device_id == device_id,
            SensorReading.sensor_type == sensor_type,
        )
        .order_by(desc(SensorReading.timestamp))
        .limit(HISTORY_LENGTH)
        .all()
    )

    if not readings:
        return None, None

    latest = readings[0]
    history = [r.value for r in reversed(readings)]

    sensor_value = SensorValue(
        value=latest.value,
        history=history,
        status=get_status(latest.value, sensor_type),
    )
    return sensor_value, latest.timestamp


def _get_overall_status(sensors: RackSensors) -> str:
    """Determine worst status across all sensors."""
    statuses = []
    for field in ["water_level", "ph", "ec", "water_temp", "water_flow", "light_intensity"]:
        sensor = getattr(sensors, field)
        if sensor:
            statuses.append(sensor.status)

    if "Critical" in statuses:
        return "Critical"
    if any(s in ("Low", "High", "Warning") for s in statuses):
        return "Warning"
    return "Normal"


@router.get("/rack/{rack_id}", response_model=RackResponse)
def get_rack(rack_id: int, db: Session = Depends(get_db)):
    """Get all sensor data for a single rack."""
    device_id = f"rack_{rack_id}"
    last_updated = None

    sensor_values = {}
    for sensor_type in RACK_SENSOR_TYPES:
        sv, ts = _build_sensor_value(db, device_id, sensor_type)
        sensor_values[sensor_type] = sv
        if ts and (last_updated is None or ts > last_updated):
            last_updated = ts

    sensors = RackSensors(**sensor_values)

    esp32_online = False
    if last_updated:
        now = datetime.now(timezone.utc)
        esp32_online = (now - last_updated) < OFFLINE_TIMEOUT

    return RackResponse(
        id=rack_id,
        label=f"Rack {rack_id}",
        sensors=sensors,
        overall_status=_get_overall_status(sensors),
        last_updated=last_updated,
        esp32_online=esp32_online,
    )


@router.get("/racks", response_model=list[RackResponse])
def get_all_racks(db: Session = Depends(get_db)):
    """Get summary of all racks (1-5)."""
    return [get_rack(i, db) for i in range(1, 6)]
