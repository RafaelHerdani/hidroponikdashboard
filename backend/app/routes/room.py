"""
Room sensor API routes.
GET /api/room — latest room data (temperature + humidity) with history.
"""

from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import SensorReading
from ..schemas import RoomResponse, SensorValue
from ..thresholds import get_status

router = APIRouter(prefix="/api", tags=["room"])

HISTORY_LENGTH = 25
OFFLINE_TIMEOUT = timedelta(seconds=15)


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

    # readings[0] is the most recent
    latest = readings[0]
    # Reverse to get chronological order for history
    history = [r.value for r in reversed(readings)]

    sensor_value = SensorValue(
        value=latest.value,
        history=history,
        status=get_status(latest.value, sensor_type),
    )
    return sensor_value, latest.timestamp


@router.get("/room", response_model=RoomResponse)
def get_room(db: Session = Depends(get_db)):
    """Get latest room temperature & humidity with history."""
    temp, temp_time = _build_sensor_value(db, "room", "temperature")
    hum, hum_time = _build_sensor_value(db, "room", "humidity")

    # Determine last update time
    last_updated = None
    if temp_time and hum_time:
        last_updated = max(temp_time, hum_time)
    elif temp_time:
        last_updated = temp_time
    elif hum_time:
        last_updated = hum_time

    # ESP32 is "online" if last reading was < 15 seconds ago
    esp32_online = False
    if last_updated:
        now = datetime.now(timezone.utc)
        esp32_online = (now - last_updated) < OFFLINE_TIMEOUT

    return RoomResponse(
        temperature=temp,
        humidity=hum,
        last_updated=last_updated,
        esp32_online=esp32_online,
    )
