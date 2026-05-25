"""
Application configuration — environment variables and settings.

Uses pydantic-settings to load from .env file or environment.
"""

from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # ── App ──────────────────────────────────────────────────────────────
    APP_NAME: str = "CKD Guardian API"
    APP_VERSION: str = "0.2.0"
    DEBUG: bool = False

    # ── Database ─────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql://ckdguardian:ckdguardian@localhost:5432/ckdguardian_db"

    # ── Security ─────────────────────────────────────────────────────────
    SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    INTERNAL_API_KEY: str = "ckdguardian-secure-key-2026"
    BCRYPT_ROUNDS: int = 12

    # ── CORS ─────────────────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://ckdguardianofficial.vercel.app",
        "capacitor://localhost",
        "http://localhost"
    ]

    # ── OTP / Password Reset ────────────────────────────────────────────
    OTP_EXPIRY_MINUTES: int = 15

    # ── Brevo Email Service ──────────────────────────────────────────────
    BREVO_API_KEY: str = ""
    BREVO_SENDER_EMAIL: str = "alerts@ckdguardian.com"
    BREVO_SENDER_NAME: str = "CKD Guardian Alerts"

    # ── Firebase ─────────────────────────────────────────────────────────
    FIREBASE_SERVICE_ACCOUNT_KEY: str | None = None

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, value: Any) -> bool:
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"1", "true", "yes", "on", "debug"}:
                return True
            if normalized in {"0", "false", "no", "off", "release", "production", "prod", ""}:
                return False
        return bool(value)

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


@lru_cache()
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
