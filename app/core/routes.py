from __future__ import annotations

from fastapi import APIRouter

from app.modules.auth.views import router as auth_router
from app.modules.political_intelligence.views import router as political_intelligence_router
from app.modules.prediction_markets.views import router as prediction_markets_router
from app.modules.users.views import router as users_router


api_router = APIRouter()

# Module routers registered here (single place)
api_router.include_router(auth_router, prefix="/auth", tags=["Auth"])
api_router.include_router(users_router, prefix="/users", tags=["Users"])
api_router.include_router(
    political_intelligence_router,
    prefix="/political-intelligence",
    tags=["Political Intelligence"],
)
api_router.include_router(
    prediction_markets_router,
    prefix="/prediction",
    tags=["Prediction Markets"],
)
