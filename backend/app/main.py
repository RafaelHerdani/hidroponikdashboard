"""
FastAPI entry point — Lab Smart Farming Backend.
Starts MQTT subscriber on startup, serves REST API for the dashboard.
"""

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base
from .mqtt_client import mqtt_subscriber
from .routes import room, rack, history, readings, auth

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup & shutdown lifecycle."""
    # Create database tables
    logger.info("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Database tables ready")

    # Start MQTT subscriber as background task
    logger.info("Starting MQTT subscriber...")
    mqtt_task = asyncio.create_task(mqtt_subscriber())

    yield

    # Shutdown
    mqtt_task.cancel()
    try:
        await mqtt_task
    except asyncio.CancelledError:
        pass
    logger.info("Shutdown complete")


app = FastAPI(
    title="Lab Smart Farming API",
    description="Backend API for hydroponic monitoring system",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend to access API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, set to specific frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(room.router)
app.include_router(rack.router)
app.include_router(history.router)
app.include_router(readings.router)
app.include_router(auth.router)


@app.get("/")
def health_check():
    return {"status": "ok", "service": "Lab Smart Farming API"}
