"""
CKD Guardian Backend — FastAPI application entry point.

Run with:
    uvicorn app.main:app --reload --port 8000
"""

import asyncio
import httpx
from contextlib import asynccontextmanager, suppress
from datetime import datetime, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.database.session import engine
from app.database.base import Base

# Import all models so Base.metadata knows about them
import app.models  # noqa: F401

from app.api import chat, hospital, urea, lcr, records, intelligence, users, auth, requests, medications, alert, push, notification_preferences, notifications
from app.api import ml_models
from app.services.message_cleanup import run_message_cleanup_scheduler
from app.services.medicine_reminder import run_medicine_reminder_scheduler
from app.websockets import chat as chat_ws

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan — runs on startup and shutdown.
    
    Creates all tables if they don't exist (safe for development).
    In production, use Alembic migrations instead.
    """
    # Startup: create tables if needed (dev convenience)
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables verified/created")

    # Load the trained CKD ML model (singleton — loaded once, used for all requests)
    from app.services.model_loader import load_model, is_model_loaded
    if load_model():
        print("✅ CKD ML model loaded and ready for predictions")
    else:
        print("⚠️ ML model not loaded — predictions will fail until model is trained")
        print("   Run: cd ckd-app && python -m ml.training.train_ckd_model")

    cleanup_task = asyncio.create_task(run_message_cleanup_scheduler())
    reminder_task = asyncio.create_task(run_medicine_reminder_scheduler())
    keepalive_task = asyncio.create_task(_keep_alive_ping())
    yield
    cleanup_task.cancel()
    reminder_task.cancel()
    keepalive_task.cancel()
    with suppress(asyncio.CancelledError):
        await cleanup_task
    with suppress(asyncio.CancelledError):
        await reminder_task
    with suppress(asyncio.CancelledError):
        await keepalive_task
    # Shutdown: nothing to clean up (connection pool handles itself)
    print("🔌 Shutting down CKD Guardian API")


async def _keep_alive_ping():
    """Pings /ping every 10 minutes to prevent Render free-tier sleep."""
    await asyncio.sleep(60)  # Wait 1 min after startup before first ping
    async with httpx.AsyncClient() as client:
        while True:
            try:
                await client.get("https://ckdguardian.onrender.com/ping", timeout=10)
            except Exception:
                pass  # Ignore errors — this is best-effort
            await asyncio.sleep(600)  # 10 minutes


app = FastAPI(
    title=settings.APP_NAME,
    description="CKD Monitoring & Prediction Backend — ML-Ready Architecture",
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# CORS — allow frontend origins incl. all Vercel preview deployments
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    # Also allow any *.vercel.app URL (handles preview/branch deployments)
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import Request
from fastapi.responses import JSONResponse

@app.middleware("http")
async def verify_api_key(request: Request, call_next):
    # Skip health check, docs, and websockets
    path = request.url.path
    if request.method == "OPTIONS" or path in ("/", "/ping", "/health") or path.startswith(("/docs", "/openapi.json", "/ws")):
        return await call_next(request)
        
    api_key = request.headers.get("X-API-Key")
    if api_key != settings.INTERNAL_API_KEY:
        return JSONResponse(status_code=403, content={"detail": "Forbidden: Invalid or missing X-API-Key"})
        
    return await call_next(request)

# ── Register API routers ────────────────────────────────────────────────────
app.include_router(hospital.router)
app.include_router(urea.router)
app.include_router(lcr.router)
app.include_router(records.router)
app.include_router(intelligence.router)
app.include_router(users.router)
app.include_router(auth.router)
app.include_router(requests.router)
app.include_router(ml_models.router)
app.include_router(chat.router)
app.include_router(medications.router)
app.include_router(alert.router)
app.include_router(chat_ws.router)
app.include_router(push.router)
app.include_router(notification_preferences.router)
app.include_router(notifications.router)


# ── Core endpoints ──────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "status": "ok",
        "service": "ckdguardian-api",
        "version": settings.APP_VERSION,
    }


@app.api_route("/ping", methods=["GET", "HEAD"])
async def ping():
    """Ultra-fast connectivity check — no DB query. Supports GET and HEAD."""
    return {"status": "ok"}


# ── Cached health state ─────────────────────────────────────────────────────
import time as _time
from sqlalchemy import text as _sa_text

_health_cache: dict = {"db_status": "unknown", "checked_at": 0}
_HEALTH_CACHE_TTL = 30  # seconds


@app.get("/health")
async def health_check():
    """
    Health check with 30-second DB status cache.
    Avoids hammering the remote database on every poll.
    """
    now = _time.monotonic()

    # Only query the DB if cache is stale
    if now - _health_cache["checked_at"] > _HEALTH_CACHE_TTL:
        try:
            from app.database.session import SessionLocal
            db = SessionLocal()
            db.execute(_sa_text("SELECT 1"))
            db.close()
            _health_cache["db_status"] = "connected"
        except Exception:
            _health_cache["db_status"] = "disconnected"
        _health_cache["checked_at"] = now

    return {
        "status": "healthy",
        "service": "ckdguardian-api",
        "version": settings.APP_VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "components": {
            "database": _health_cache["db_status"],
            "ml_models": _get_ml_status(),
        },
    }


def _get_ml_status() -> str:
    """Return the current ML model loading status."""
    try:
        from app.services.model_loader import is_model_loaded, get_metadata
        if is_model_loaded():
            meta = get_metadata()
            version = meta.get("version", "unknown")
            return f"loaded_v{version}"
        return "not_loaded"
    except Exception:
        return "error"
