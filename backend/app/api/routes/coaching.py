from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.auth import AuthContext, get_auth_context
from app.core.db import get_db
from app.services.coaching import coaching_service

router = APIRouter(prefix="/api/coaching", tags=["coaching"])


@router.get("/calls")
async def coaching_calls(ctx: AuthContext = Depends(get_auth_context)):
    """Completed calls with their scorecards for the coaching review page."""
    db = get_db()
    calls = (await db.table("calls").select("*").eq("team_id", ctx.team_id)
             .eq("status", "completed").order("created_at", desc=True).execute()).data or []
    cards = {c["call_id"]: c for c in
             (await db.table("call_scorecards").select("*").eq("team_id", ctx.team_id).execute()).data or []}
    for c in calls:
        c["scorecard"] = cards.get(c["id"])
    return {"calls": calls}


@router.get("/scorecard/{call_id}")
async def scorecard(call_id: str, ctx: AuthContext = Depends(get_auth_context)):
    db = get_db()
    existing = (await db.table("call_scorecards").select("*").eq("call_id", call_id).execute()).data
    if existing:
        return {"scorecard": existing[0]}
    return {"scorecard": await coaching_service.scorecard(call_id)}


@router.post("/scorecard/{call_id}/regenerate")
async def regenerate(call_id: str, ctx: AuthContext = Depends(get_auth_context)):
    return {"scorecard": await coaching_service.scorecard(call_id)}


@router.get("/leaderboard")
async def leaderboard(ctx: AuthContext = Depends(get_auth_context)):
    return {"leaderboard": await coaching_service.rep_leaderboard(ctx.team_id)}


class RoleplayRequest(BaseModel):
    scenario: str
    persona: str = "skeptical VP of Sales"
    turns: list[dict] | None = None


@router.post("/roleplay")
async def roleplay(body: RoleplayRequest, ctx: AuthContext = Depends(get_auth_context)):
    return await coaching_service.roleplay(body.scenario, persona=body.persona, turns=body.turns)
