from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import AuthContext, get_auth_context
from app.services.sequences import sequence_service

router = APIRouter(prefix="/api/sequences", tags=["sequences"])


class GenerateSequence(BaseModel):
    account_id: str
    contact_id: str | None = None
    persona: str = "VP of Sales"
    objective: str = "book a 20-min intro"
    tone: str = "consultative"
    channels: list[str] | None = None
    approval_mode: str = "manual"


@router.post("/generate")
async def generate(body: GenerateSequence, ctx: AuthContext = Depends(get_auth_context)):
    return await sequence_service.generate(
        ctx.team_id, body.account_id, contact_id=body.contact_id, persona=body.persona,
        objective=body.objective, tone=body.tone, channels=body.channels,
        approval_mode=body.approval_mode, owner_id=ctx.user_id,
    )


@router.get("")
async def list_sequences(ctx: AuthContext = Depends(get_auth_context)):
    return {"sequences": await sequence_service.list(ctx.team_id)}


@router.get("/{sequence_id}")
async def get_sequence(sequence_id: str, ctx: AuthContext = Depends(get_auth_context)):
    res = await sequence_service.get(sequence_id)
    if not res["sequence"]:
        raise HTTPException(404, "Sequence not found")
    return res


@router.post("/{sequence_id}/approve")
async def approve(sequence_id: str, ctx: AuthContext = Depends(get_auth_context)):
    return await sequence_service.approve(sequence_id)


@router.post("/{sequence_id}/launch")
async def launch(sequence_id: str, ctx: AuthContext = Depends(get_auth_context)):
    return await sequence_service.launch(sequence_id)
