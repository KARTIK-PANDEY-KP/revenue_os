from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.auth import AuthContext, get_auth_context
from app.services.prospecting import prospecting_service

router = APIRouter(prefix="/api/prospecting", tags=["prospecting"])


class ProspectRequest(BaseModel):
    query: str
    limit: int = 4


@router.post("/search")
async def prospect(body: ProspectRequest, ctx: AuthContext = Depends(get_auth_context)):
    """ICP query -> discovered, researched, ranked accounts with openers."""
    return await prospecting_service.search(ctx.team_id, body.query, limit=body.limit,
                                            owner_id=ctx.user_id)
