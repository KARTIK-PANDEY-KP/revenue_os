from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.core.auth import AuthContext, get_auth_context
from app.core.db import get_db
from app.services.memory import memory_service
from app.services.research import account_research_service

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


class ResearchRequest(BaseModel):
    company: str
    owner_id: str | None = None


@router.post("/research")
async def research_account(body: ResearchRequest, ctx: AuthContext = Depends(get_auth_context)):
    """Build/refresh a full company intelligence profile via Bright Data + Cognee."""
    return await account_research_service.research(ctx.team_id, body.company,
                                                   owner_id=body.owner_id or ctx.user_id)


@router.get("")
async def list_accounts(
    ctx: AuthContext = Depends(get_auth_context),
    stage: str | None = None,
    industry: str | None = None,
    owner_id: str | None = None,
    min_score: float | None = None,
    q: str | None = None,
    sort: str = Query("overall_score"),
):
    db = get_db()
    query = db.table("accounts").select("*").eq("team_id", ctx.team_id)
    if stage:
        query = query.eq("stage", stage)
    if industry:
        query = query.eq("industry", industry)
    if owner_id:
        query = query.eq("owner_id", owner_id)
    if min_score is not None:
        query = query.gte("overall_score", min_score)
    if q:
        query = query.ilike("name", f"%{q}%")
    rows = (await query.order(sort, desc=True).execute()).data or []
    return {"accounts": rows, "count": len(rows)}


@router.get("/{account_id}")
async def get_account(account_id: str, ctx: AuthContext = Depends(get_auth_context)):
    db = get_db()
    acct = (await db.table("accounts").select("*").eq("id", account_id).limit(1).execute()).data
    if not acct:
        raise HTTPException(404, "Account not found")
    account = acct[0]
    contacts = (await db.table("contacts").select("*").eq("account_id", account_id).execute()).data or []
    signals = (await db.table("signals").select("*").eq("account_id", account_id)
               .order("detected_at", desc=True).execute()).data or []
    risks = (await db.table("risk_flags").select("*").eq("account_id", account_id).execute()).data or []
    scores = (await db.table("account_scores").select("*").eq("account_id", account_id)
              .order("scored_at", desc=True).limit(20).execute()).data or []
    calls = (await db.table("calls").select("*").eq("account_id", account_id)
             .order("created_at", desc=True).execute()).data or []
    sequences = (await db.table("sequences").select("*").eq("account_id", account_id).execute()).data or []
    messages = (await db.table("outreach_messages").select("*").eq("account_id", account_id)
                .order("created_at", desc=True).execute()).data or []
    return {
        "account": account, "contacts": contacts, "signals": signals, "risk_flags": risks,
        "score_history": scores, "calls": calls, "sequences": sequences, "outreach": messages,
    }


@router.get("/{account_id}/signals")
async def account_signals(account_id: str, ctx: AuthContext = Depends(get_auth_context)):
    db = get_db()
    rows = (await db.table("signals").select("*").eq("account_id", account_id)
            .order("detected_at", desc=True).execute()).data or []
    return {"signals": rows}


@router.get("/{account_id}/timeline")
async def account_timeline(account_id: str, ctx: AuthContext = Depends(get_auth_context)):
    return {"timeline": await memory_service.timeline(ctx.team_id, account_id)}


@router.get("/{account_id}/why-now")
async def account_why_now(account_id: str, ctx: AuthContext = Depends(get_auth_context)):
    db = get_db()
    acct = (await db.table("accounts").select("*").eq("id", account_id).limit(1).execute()).data
    if not acct:
        raise HTTPException(404, "Account not found")
    return await memory_service.why_now(ctx.team_id, acct[0]["name"])


class UpdateAccount(BaseModel):
    stage: str | None = None
    owner_id: str | None = None
    engagement_score: float | None = None


@router.patch("/{account_id}")
async def update_account(account_id: str, body: UpdateAccount,
                         ctx: AuthContext = Depends(get_auth_context)):
    db = get_db()
    fields = {k: v for k, v in body.model_dump().items() if v is not None}
    if not fields:
        return {"updated": False}
    res = (await db.table("accounts").update(fields).eq("id", account_id).execute()).data
    return {"updated": True, "account": (res[0] if isinstance(res, list) and res else res)}
