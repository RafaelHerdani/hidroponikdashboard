"""
Readings API routes — paginated sensor data + CSV export.
GET /api/readings       — paginated table data
GET /api/readings/export — CSV download
"""

import csv
import io
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel

from ..database import get_db
from ..models import SensorReading
from .auth import verify_token

router = APIRouter(prefix="/api", tags=["readings"])


class ReadingRow(BaseModel):
    id: int
    device_id: str
    sensor_type: str
    value: float
    timestamp: datetime

    class Config:
        from_attributes = True


class PaginatedReadings(BaseModel):
    data: list[ReadingRow]
    total: int
    page: int
    limit: int
    pages: int


@router.get("/readings", response_model=PaginatedReadings)
def get_readings(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    device: Optional[str] = Query(None),
    sensor: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    db: Session = Depends(get_db),
    user: dict = Depends(verify_token),
):
    """Get paginated sensor readings."""
    query = db.query(SensorReading)

    if device:
        query = query.filter(SensorReading.device_id == device)
    if sensor:
        query = query.filter(SensorReading.sensor_type == sensor)
    if from_date:
        try:
            dt = datetime.fromisoformat(from_date)
            query = query.filter(SensorReading.timestamp >= dt)
        except ValueError:
            pass
    if to_date:
        try:
            dt = datetime.fromisoformat(to_date)
            query = query.filter(SensorReading.timestamp <= dt)
        except ValueError:
            pass

    total = query.count()
    pages = max(1, (total + limit - 1) // limit)

    readings = (
        query
        .order_by(desc(SensorReading.timestamp))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return PaginatedReadings(
        data=[ReadingRow.model_validate(r) for r in readings],
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


@router.get("/readings/export")
def export_readings(
    device: Optional[str] = Query(None),
    sensor: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    db: Session = Depends(get_db),
    user: dict = Depends(verify_token),
):
    """Export sensor readings as CSV."""
    query = db.query(SensorReading)

    if device:
        query = query.filter(SensorReading.device_id == device)
    if sensor:
        query = query.filter(SensorReading.sensor_type == sensor)
    if from_date:
        try:
            dt = datetime.fromisoformat(from_date)
            query = query.filter(SensorReading.timestamp >= dt)
        except ValueError:
            pass
    if to_date:
        try:
            dt = datetime.fromisoformat(to_date)
            query = query.filter(SensorReading.timestamp <= dt)
        except ValueError:
            pass

    readings = query.order_by(desc(SensorReading.timestamp)).limit(50000).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "device_id", "sensor_type", "value", "timestamp"])
    for r in readings:
        writer.writerow([r.id, r.device_id, r.sensor_type, r.value, r.timestamp.isoformat()])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=sensor_readings.csv"},
    )
