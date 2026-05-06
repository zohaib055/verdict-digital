from __future__ import annotations

from collections.abc import Generator
from datetime import datetime
import importlib

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import get_db
from app.core.models import Base
from app.main import app
from app.modules.prediction_markets import services as prediction_market_services

# Import models so SQLAlchemy metadata contains all tables for create_all.
importlib.import_module("app.modules.political_intelligence.models")
importlib.import_module("app.modules.prediction_markets.models")
importlib.import_module("app.modules.users.models")


@compiles(JSONB, "sqlite")
def _compile_jsonb_for_sqlite(type_, compiler, **kw):
    return "JSON"


@pytest.fixture(autouse=True)
def _sqlite_compatible_clock(monkeypatch: pytest.MonkeyPatch) -> None:
    # SQLite returns timezone-aware DateTime columns as naive datetimes. Keep the
    # market close-time comparison on the same footing as the test database.
    monkeypatch.setattr(prediction_market_services, "now_utc", datetime.now)


@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )

    @event.listens_for(engine, "connect")
    def _enable_foreign_keys(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    jsonb_defaults = []
    for table in Base.metadata.tables.values():
        for column in table.columns:
            default_text = str(column.server_default.arg) if column.server_default is not None else ""
            if "::jsonb" in default_text:
                jsonb_defaults.append((column, column.server_default))
                column.server_default = None

    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
    session = SessionLocal()

    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)
        engine.dispose()
        for column, server_default in jsonb_defaults:
            column.server_default = server_default


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
