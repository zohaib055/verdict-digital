from __future__ import annotations

from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.auth.schemas import LoginRequest, SignupRequest
from app.modules.auth.security import create_access_token, decode_access_token, hash_password, verify_password
from app.modules.users.models import User


def now_utc() -> datetime:
    return datetime.now(UTC)


def signup(db: Session, payload: SignupRequest) -> tuple[str, User]:
    existing = db.scalar(
        select(User).where(or_(User.email == payload.email, User.username == payload.username))
    )
    if existing:
        raise HTTPException(status_code=409, detail="Email or username already exists")

    user = User(
        email=payload.email,
        username=payload.username,
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email or username already exists")
    db.refresh(user)
    token = create_access_token(user_id=user.id, email=user.email)
    return token, user


def login(db: Session, payload: LoginRequest) -> tuple[str, User]:
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive")
    user.last_login_at = now_utc()
    db.commit()
    db.refresh(user)
    token = create_access_token(user_id=user.id, email=user.email)
    return token, user


def get_current_user_from_token(db: Session, token: str) -> User:
    try:
        payload = decode_access_token(token)
        user_id = int(payload["sub"])
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from exc

    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive")
    return user
