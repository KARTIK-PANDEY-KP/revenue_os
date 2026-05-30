from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.auth import AuthContext, get_auth_context
from app.core.db import get_db
from app.services.outreach import outreach_service
from app.services.personalization import personalization_service

router = APIRouter(prefix="/api/outreach", tags=["outreach"])


class DraftRequest(BaseModel):
    account_id: str
    contact_id: str | None = None
    channel: str = "email"
    tone: str = "consultative"
    objective: str = "book a meeting"


@router.post("/draft")
async def draft(body: DraftRequest, ctx: AuthContext = Depends(get_auth_context)):
    return await outreach_service.draft(
        ctx.team_id, body.account_id, contact_id=body.contact_id, channel=body.channel,
        tone=body.tone, objective=body.objective,
    )


@router.get("/drafts")
async def drafts(ctx: AuthContext = Depends(get_auth_context)):
    return {"drafts": await outreach_service.list_drafts(ctx.team_id)}


class EditMessage(BaseModel):
    subject: str | None = None
    body: str | None = None


@router.patch("/{message_id}")
async def edit(message_id: str, body: EditMessage, ctx: AuthContext = Depends(get_auth_context)):
    fields = {k: v for k, v in body.model_dump().items() if v is not None}
    return await outreach_service.update(message_id, fields)


@router.post("/{message_id}/approve")
async def approve(message_id: str, ctx: AuthContext = Depends(get_auth_context)):
    return await outreach_service.approve(message_id)


@router.post("/{message_id}/send")
async def send(message_id: str, ctx: AuthContext = Depends(get_auth_context)):
    return await outreach_service.mark_sent(message_id)


class ObjectionsRequest(BaseModel):
    account_id: str


@router.post("/objections")
async def objections(body: ObjectionsRequest, ctx: AuthContext = Depends(get_auth_context)):
    db = get_db()
    acct = (await db.table("accounts").select("*").eq("id", body.account_id).limit(1).execute()).data
    signals = (await db.table("signals").select("*").eq("account_id", body.account_id)
               .order("detected_at", desc=True).limit(5).execute()).data or []
    account = acct[0] if acct else {"team_id": ctx.team_id, "name": "Account"}
    return {"objections": await personalization_service.objection_responses(account, signals)}
