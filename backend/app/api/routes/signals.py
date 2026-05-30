from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.auth import AuthContext, get_auth_context
from app.core.db import get_db
from app.services.workflows import workflow_service

router = APIRouter(prefix="/api/signals", tags=["signals"])


@router.get("")
async def list_signals(
    ctx: AuthContext = Depends(get_auth_context),
    type: str | None = None,
    status: str | None = None,
    min_confidence: float | None = None,
    sort: str = "detected_at",
):
    db = get_db()
    query = db.table("signals").select("*").eq("team_id", ctx.team_id)
    if type:
        query = query.eq("type", type)
    if status:
        query = query.eq("status", status)
    if min_confidence is not None:
        query = query.gte("confidence", min_confidence)
    rows = (await query.order(sort, desc=True).execute()).data or []
    # join account names for display
    accounts = {a["id"]: a for a in
                (await db.table("accounts").select("*").eq("team_id", ctx.team_id).execute()).data or []}
    for s in rows:
        acct = accounts.get(s["account_id"], {})
        s["account_name"] = acct.get("name")
        s["account_logo"] = acct.get("logo_url")
        s["account_score"] = acct.get("overall_score")
    return {"signals": rows, "count": len(rows)}


class SignalStatus(BaseModel):
    status: str


@router.patch("/{signal_id}")
async def update_signal(signal_id: str, body: SignalStatus,
                        ctx: AuthContext = Depends(get_auth_context)):
    db = get_db()
    res = (await db.table("signals").update({"status": body.status}).eq("id", signal_id).execute()).data
    return {"signal": (res[0] if isinstance(res, list) and res else res)}


@router.post("/{signal_id}/action")
async def action_signal(signal_id: str, ctx: AuthContext = Depends(get_auth_context)):
    """Run the new-signal workflow (draft outreach / create call task)."""
    return await workflow_service.signal_detected(signal_id)
