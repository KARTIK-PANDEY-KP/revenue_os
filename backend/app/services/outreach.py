"""OutreachService — generate + persist concrete outreach messages."""
from __future__ import annotations

from typing import Any

from app.core.db import get_db, now_iso
from app.core.logging import get_logger
from app.core.tasks import spawn
from app.services.memory import memory_service
from app.services.personalization import personalization_service

log = get_logger("outreach")


class OutreachService:
    async def _load(self, team_id: str, account_id: str, contact_id: str | None):
        db = get_db()
        acct = (await db.table("accounts").select("*").eq("id", account_id).limit(1).execute()).data
        account = acct[0] if acct else {"id": account_id, "team_id": team_id, "name": "Account"}
        contact = None
        if contact_id:
            c = (await db.table("contacts").select("*").eq("id", contact_id).limit(1).execute()).data
            contact = c[0] if c else None
        signals = (await db.table("signals").select("*").eq("account_id", account_id)
                   .order("detected_at", desc=True).limit(5).execute()).data or []
        return account, contact, signals

    async def draft(
        self, team_id: str, account_id: str, *, contact_id: str | None = None,
        channel: str = "email", tone: str = "consultative", objective: str = "book a meeting",
        sequence_id: str | None = None, step_id: str | None = None,
    ) -> dict[str, Any]:
        account, contact, signals = await self._load(team_id, account_id, contact_id)

        if channel == "linkedin":
            gen = await personalization_service.linkedin(account, contact, signals, tone=tone)
            subject, body = None, gen["body"]
        elif channel == "call":
            gen = await personalization_service.call_opener(account, contact, signals)
            subject, body = "Call opener", gen["opener"]
        elif channel == "sms":
            gen = await personalization_service.linkedin(account, contact, signals, tone=tone)
            subject, body = None, gen["body"]
        else:
            gen = await personalization_service.email(account, contact, signals, tone=tone, objective=objective)
            subject, body = gen.get("subject"), gen["body"]

        db = get_db()
        row = {
            "team_id": team_id, "account_id": account_id, "contact_id": contact_id,
            "sequence_id": sequence_id, "step_id": step_id, "channel": channel,
            "subject": subject, "body": body, "status": "draft",
            "grounding": {"signals": [s["id"] for s in signals],
                          "why_now": account.get("why_now")},
        }
        inserted = (await db.table("outreach_messages").insert(row).execute()).data
        message = inserted[0] if isinstance(inserted, list) else inserted or row
        spawn(memory_service.ingest_message(message), name="cognee:message")
        return message

    async def update(self, message_id: str, fields: dict[str, Any]) -> dict[str, Any]:
        db = get_db()
        res = (await db.table("outreach_messages").update(fields).eq("id", message_id).execute()).data
        return (res[0] if isinstance(res, list) and res else res) or {}

    async def approve(self, message_id: str) -> dict[str, Any]:
        return await self.update(message_id, {"status": "approved"})

    async def mark_sent(self, message_id: str) -> dict[str, Any]:
        return await self.update(message_id, {"status": "sent", "sent_at": now_iso()})

    async def list_drafts(self, team_id: str) -> list[dict[str, Any]]:
        db = get_db()
        return (await db.table("outreach_messages").select("*").eq("team_id", team_id)
                .eq("status", "draft").order("created_at", desc=True).execute()).data or []


outreach_service = OutreachService()
