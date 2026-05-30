from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import AuthContext, get_auth_context
from app.core.db import get_db
from app.services.voice import voice_service

router = APIRouter(prefix="/api/calls", tags=["calls"])


class CreateCall(BaseModel):
    account_id: str | None = None
    contact_id: str | None = None
    scheduled: bool = False


@router.post("")
async def create_call(body: CreateCall, ctx: AuthContext = Depends(get_auth_context)):
    """Create a call session and return LiveKit + Speechmatics credentials + prep."""
    return await voice_service.create_call(ctx, account_id=body.account_id,
                                           contact_id=body.contact_id, scheduled=body.scheduled)


@router.get("")
async def list_calls(ctx: AuthContext = Depends(get_auth_context), status: str | None = None):
    db = get_db()
    q = db.table("calls").select("*").eq("team_id", ctx.team_id)
    if status:
        q = q.eq("status", status)
    rows = (await q.order("created_at", desc=True).execute()).data or []
    return {"calls": rows}


@router.get("/{call_id}")
async def get_call(call_id: str, ctx: AuthContext = Depends(get_auth_context)):
    db = get_db()
    call = (await db.table("calls").select("*").eq("id", call_id).limit(1).execute()).data
    if not call:
        raise HTTPException(404, "Call not found")
    transcript = (await db.table("call_transcripts").select("*").eq("call_id", call_id)
                  .order("start_ms").execute()).data or []
    scorecard = (await db.table("call_scorecards").select("*").eq("call_id", call_id).execute()).data
    return {"call": call[0], "transcript": transcript,
            "scorecard": scorecard[0] if scorecard else None}


@router.get("/{call_id}/tokens")
async def call_tokens(call_id: str, ctx: AuthContext = Depends(get_auth_context)):
    return await voice_service.tokens(call_id, identity=ctx.user_id, name=ctx.email)


class EndCall(BaseModel):
    disposition: str | None = None
    notes: str | None = None
    duration_secs: int | None = None


@router.post("/{call_id}/end")
async def end_call(call_id: str, body: EndCall, ctx: AuthContext = Depends(get_auth_context)):
    return await voice_service.end_call(call_id, disposition=body.disposition,
                                        notes=body.notes, duration_secs=body.duration_secs)
