"""
Auth routes — simple JWT authentication.
POST /api/auth/login — login with username/password
GET  /api/auth/me     — verify token
"""

import os
import logging
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel

logger = logging.getLogger("auth")

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Simple credentials from env vars (default: admin/admin123)
ADMIN_USER = os.getenv("ADMIN_USER", "admin")
ADMIN_PASS = os.getenv("ADMIN_PASS", "admin123")

# Simple token-based auth (no JWT library needed for simplicity)
# In production, use python-jose or similar
import hashlib
import secrets

# Store active tokens in memory (simple approach)
_active_tokens: dict[str, dict] = {}


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    username: str
    message: str


class UserInfo(BaseModel):
    username: str
    logged_in_at: str


def _generate_token(username: str) -> str:
    """Generate a simple auth token."""
    raw = f"{username}:{secrets.token_hex(32)}"
    token = hashlib.sha256(raw.encode()).hexdigest()
    _active_tokens[token] = {
        "username": username,
        "logged_in_at": datetime.now(timezone.utc).isoformat(),
    }
    return token


def verify_token(authorization: str = Header(None)) -> dict:
    """Dependency to verify auth token."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Token required")

    token = authorization.replace("Bearer ", "")
    if token not in _active_tokens:
        raise HTTPException(status_code=401, detail="Invalid token")

    return _active_tokens[token]


@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest):
    """Login with username and password."""
    if req.username != ADMIN_USER or req.password != ADMIN_PASS:
        raise HTTPException(status_code=401, detail="Username atau password salah")

    token = _generate_token(req.username)
    logger.info(f"✅ User '{req.username}' logged in")

    return LoginResponse(
        token=token,
        username=req.username,
        message="Login berhasil",
    )


@router.get("/me", response_model=UserInfo)
def get_me(user: dict = Depends(verify_token)):
    """Get current user info."""
    return UserInfo(
        username=user["username"],
        logged_in_at=user["logged_in_at"],
    )
