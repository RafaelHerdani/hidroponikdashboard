"""
MQTT Client — subscribes to hidroponik/# topics and saves data to PostgreSQL.
Runs as a background asyncio task inside FastAPI.
"""

import os
import json
import asyncio
import logging
from datetime import datetime, timezone

import aiomqtt
from sqlalchemy.orm import Session

from .database import SessionLocal
from .models import SensorReading

logger = logging.getLogger("mqtt")

MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))

# Map of MQTT topic → (device_id, sensor_fields)
# hidroponik/room       → device_id="room",   fields=["temperature","humidity"]
# hidroponik/rack/{id}  → device_id="rack_{id}", fields=["ph","ec",...]


def _save_reading(device_id: str, sensor_type: str, value: float) -> None:
    """Save a single sensor reading to the database."""
    db: Session = SessionLocal()
    try:
        reading = SensorReading(
            device_id=device_id,
            sensor_type=sensor_type,
            value=value,
            timestamp=datetime.now(timezone.utc),
        )
        db.add(reading)
        db.commit()
    except Exception as e:
        logger.error(f"DB write error: {e}")
        db.rollback()
    finally:
        db.close()


def _process_room(payload: dict) -> None:
    """Process room sensor payload: {"temperature": 26.5, "humidity": 62}"""
    for sensor_type in ("temperature", "humidity"):
        if sensor_type in payload:
            _save_reading("room", sensor_type, float(payload[sensor_type]))


def _process_rack(rack_id: str, payload: dict) -> None:
    """Process rack sensor payload."""
    device_id = f"rack_{rack_id}"
    for sensor_type in ("ph", "ec", "water_temp", "water_level", "water_flow", "light_intensity"):
        if sensor_type in payload:
            _save_reading(device_id, sensor_type, float(payload[sensor_type]))


async def mqtt_subscriber() -> None:
    """
    Long-running task: connect to MQTT broker and process messages.
    Automatically reconnects on failure.
    """
    while True:
        try:
            logger.info(f"Connecting to MQTT broker at {MQTT_BROKER}:{MQTT_PORT}...")
            async with aiomqtt.Client(MQTT_BROKER, MQTT_PORT) as client:
                await client.subscribe("hidroponik/#")
                logger.info("✅ MQTT connected — subscribed to hidroponik/#")

                async for message in client.messages:
                    topic = str(message.topic)
                    raw = message.payload
                    try:
                        payload = json.loads(raw.decode())
                    except (json.JSONDecodeError, UnicodeDecodeError) as e:
                        logger.warning(f"Invalid payload on {topic}: {raw!r} ({e})")
                        continue

                    logger.info(f"📩 {topic}: {payload}")

                    if topic == "hidroponik/room":
                        _process_room(payload)
                    elif topic.startswith("hidroponik/rack/"):
                        rack_id = topic.split("/")[-1]
                        _process_rack(rack_id, payload)
                    else:
                        logger.debug(f"Unknown topic: {topic}")

        except aiomqtt.MqttError as e:
            logger.warning(f"MQTT connection lost: {e}. Reconnecting in 5s...")
            await asyncio.sleep(5)
        except Exception as e:
            logger.error(f"MQTT unexpected error: {e}. Reconnecting in 5s...")
            await asyncio.sleep(5)
