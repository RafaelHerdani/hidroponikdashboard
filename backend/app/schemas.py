from datetime import datetime
from pydantic import BaseModel


class SensorValue(BaseModel):
    """Single sensor data point for API responses."""

    value: float
    history: list[float]
    status: str


class RoomResponse(BaseModel):
    """GET /api/room response."""

    temperature: SensorValue | None = None
    humidity: SensorValue | None = None
    last_updated: datetime | None = None
    esp32_online: bool = False


class RackSensors(BaseModel):
    """All sensors for one rack."""

    water_level: SensorValue | None = None
    ph: SensorValue | None = None
    ec: SensorValue | None = None
    water_temp: SensorValue | None = None
    water_flow: SensorValue | None = None
    light_intensity: SensorValue | None = None


class RackResponse(BaseModel):
    """GET /api/rack/{id} response."""

    id: int
    label: str
    sensors: RackSensors
    overall_status: str = "Normal"
    last_updated: datetime | None = None
    esp32_online: bool = False


class RoomPayload(BaseModel):
    """MQTT payload for room data."""

    temperature: float
    humidity: float


class RackPayload(BaseModel):
    """MQTT payload for rack data."""

    ph: float | None = None
    ec: float | None = None
    water_temp: float | None = None
    water_level: float | None = None
    water_flow: float | None = None
    light_intensity: float | None = None
