from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.auth import AuthContext, get_auth_context
from app.services.dashboard import dashboard_service

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("")
async def get_dashboard(ctx: AuthContext = Depends(get_auth_context)):
    return await dashboard_service.summary(ctx.team_id)
