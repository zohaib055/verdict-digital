from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.auth.dependencies import bearer_scheme
from app.modules.auth import services
from app.modules.auth.schemas import LoginRequest, TokenOut, SignupRequest


router = APIRouter()


@router.post("/signup", response_model=TokenOut)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    token, user = services.signup(db, payload)
    return {"access_token": token, "user": user}


@router.post("/login", response_model=TokenOut)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    token, user = services.login(db, payload)
    return {"access_token": token, "user": user}


@router.get("/me", response_model=TokenOut)
def me(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    user = services.get_current_user_from_token(db, credentials.credentials)
    return {"access_token": credentials.credentials, "user": user}
