from __future__ import annotations

from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.modules.auth.services import get_current_user_from_token
from app.modules.users.models import User


bearer_scheme = HTTPBearer(auto_error=True)
optional_bearer_scheme = HTTPBearer(auto_error=False)


def require_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    db: Session = Depends(get_db),
) -> User:
    return get_current_user_from_token(db, credentials.credentials)


def require_admin_user(current_user: User = Depends(require_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


def get_optional_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(optional_bearer_scheme)],
    db: Session = Depends(get_db),
) -> User | None:
    if not credentials:
        return None
    return get_current_user_from_token(db, credentials.credentials)


def ensure_user_access(path_user_id: int, current_user: User) -> None:
    if current_user.id != path_user_id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot access another user's data")
