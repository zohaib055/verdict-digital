from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Numeric, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.models import Base, TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default=text("true"), nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, server_default=text("false"), nullable=False)
    balance: Mapped[Decimal] = mapped_column(
        Numeric(18, 4),
        default=Decimal("1000"),
        server_default="1000",
        nullable=False,
    )
    reputation_score: Mapped[Decimal] = mapped_column(
        Numeric(10, 4),
        default=Decimal("50"),
        server_default="50",
        nullable=False,
    )
    accuracy_score: Mapped[Decimal] = mapped_column(
        Numeric(10, 4),
        default=Decimal("50"),
        server_default="50",
        nullable=False,
    )
    password_hash: Mapped[str] = mapped_column(String(255), default="!", server_default="!", nullable=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
