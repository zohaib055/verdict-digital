from __future__ import annotations

from typing import Any

from pydantic import Field
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central application settings loaded from environment variables / .env."""

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )

    APP_NAME: str = "Verdict Digital"
    ENV: str = "local"  # local/staging/prod
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    DATABASE_URL: str = Field(..., description="PostgreSQL connection string")
    SQL_ECHO: bool = False

    LOG_LEVEL: str = "INFO"

    POLITICAL_SCHEDULER_ENABLED: bool = True
    POLITICAL_SCHEDULER_POLL_SECONDS: int = 60
    POLITICAL_SCHEDULER_DEFAULT_INTERVAL_MINUTES: int = 1

    POLITICAL_SCRAPE_QUERY: str = "(politics OR election OR government OR policy)"
    POLITICAL_SCRAPE_MAX_PER_SOURCE: int = 20
    POLITICAL_HTTP_TIMEOUT_SECONDS: int = 10

    POLITICAL_SOURCE_GDELT_ENABLED: bool = True
    POLITICAL_SOURCE_GNEWS_ENABLED: bool = False
    GNEWS_API_KEY: str | None = None

    WEEKLY_FAUCET_AMOUNT: int = 1000
    PUBLIC_WEB_BASE_URL: str = "https://verdict.digital"
    CORS_ALLOW_ORIGINS: list[str] = [
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ]
    AUTH_SECRET_KEY: str = "change-me-in-production"
    AUTH_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug_flag(cls, value):
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            lowered = value.strip().lower()
            if lowered in {"1", "true", "yes", "on", "debug", "development"}:
                return True
            if lowered in {"0", "false", "no", "off", "release", "prod", "production"}:
                return False
        return value

    @field_validator("CORS_ALLOW_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Any):
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


settings = Settings()
