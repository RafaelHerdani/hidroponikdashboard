from datetime import datetime, timezone
from sqlalchemy import String, Float, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base


class SensorReading(Base):
    """Stores every sensor reading from all devices."""

    __tablename__ = "sensor_readings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(String(50), index=True)
    # e.g. "room", "rack_1", "rack_2"
    sensor_type: Mapped[str] = mapped_column(String(50), index=True)
    # e.g. "temperature", "humidity", "ph", "ec"
    value: Mapped[float] = mapped_column(Float)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
