"""VoiceService — the dialer / live-call workspace backend.

Builds call prep, creates call sessions, mints LiveKit + Speechmatics credentials,
records transcript segments (returning live copilot suggestions), and finalizes
calls (kicking off the call-completed workflow: summary + scorecard + follow-up).
"""
from __future__ import annotations

from typing import Any

from app.core.auth import AuthContext
from app.core.db import get_db, new_id, now_iso
from app.core.logging import get_logger
from app.integrations.livekit_client import livekit_client
from app.integrations.speechmatics_client import speechmatics_client
from app.services.copilot import copilot_service
from app.services.personalization import personalization_service

log = get_logger("voice")


class VoiceService:
    async def _account_bundle(self, account_id: str | None):
        db = get_db()
        if not account_id:
            return None, None, []
        acct = (await db.table("accounts").select("*").eq("id", account_id).limit(1).execute()).data
        account = acct[0] if acct else None
        contacts = (await db.table("contacts").select("*").eq("account_id", account_id)
                    .eq("is_decision_maker", True).execute()).data or []
        signals = (await db.table("signals").select("*").eq("account_id", account_id)
                   .order("detected_at", desc=True).limit(5).execute()).data or []
        return account, (contacts[0] if contacts else None), signals

    async def prep(self, account_id: str | None, contact_id: str | None = None) -> dict[str, Any]:
        account, contact, signals = await self._account_bundle(account_id)
        if contact_id:
            db = get_db()
            c = (await db.table("contacts").select("*").eq("id", contact_id).limit(1).execute()).data
            contact = c[0] if c else contact
        if not account:
            return {"opener": "Reference the most relevant recent signal.", "signals": [],
                    "talking_points": [], "objections": []}
        opener = await personalization_service.call_opener(account, contact, signals)
        objections = await personalization_service.objection_responses(account, signals)
        return {
            "account": account,
            "contact": contact,
            "signals": signals,
            "opener": opener.get("opener"),
            "talking_points": [s["title"] for s in signals[:3]] or [account.get("why_now")],
            "objections": objections,
        }

    async def create_call(
        self, ctx: AuthContext, *, account_id: str | None = None, contact_id: str | None = None,
        scheduled: bool = False,
    ) -> dict[str, Any]:
        db = get_db()
        call_id = new_id()
        prep = await self.prep(account_id, contact_id)
        # strip heavy nested objects from stored prep
        stored_prep = {"opener": prep.get("opener"), "talking_points": prep.get("talking_points"),
                       "objections": prep.get("objections")}
        call = {
            "id": call_id, "team_id": ctx.team_id, "account_id": account_id, "contact_id": contact_id,
            "rep_id": ctx.user_id, "status": "scheduled" if scheduled else "live",
            "direction": "outbound", "livekit_room": livekit_client.room_name(call_id),
            "prep": stored_prep, "started_at": None if scheduled else now_iso(),
        }
        await db.table("calls").insert(call).execute()
        tokens = await self.tokens(call_id, identity=ctx.user_id, name=ctx.email)
        return {"call": call, "prep": prep, **tokens}

    async def tokens(self, call_id: str, *, identity: str, name: str | None = None) -> dict[str, Any]:
        lk = livekit_client.create_token(call_id=call_id, identity=identity, name=name)
        sm = await speechmatics_client.create_temp_token()
        return {
            "livekit": lk,
            "speechmatics": {**sm, "config": speechmatics_client.rt_config()},
        }

    async def add_transcript(
        self, call_id: str, *, speaker: str, text: str, start_ms: int = 0, end_ms: int = 0,
        is_final: bool = True,
    ) -> dict[str, Any]:
        db = get_db()
        call = (await db.table("calls").select("*").eq("id", call_id).limit(1).execute()).data
        account = None
        if call and call[0].get("account_id"):
            a = (await db.table("accounts").select("*").eq("id", call[0]["account_id"]).limit(1).execute()).data
            account = a[0] if a else None

        copilot = None
        if speaker == "prospect" and is_final:
            history = [t["text"] for t in (
                await db.table("call_transcripts").select("*").eq("call_id", call_id)
                .order("start_ms").execute()).data or []]
            copilot = await copilot_service.suggest(text, account=account, history=history)

        row = {
            "team_id": call[0]["team_id"] if call else None, "call_id": call_id,
            "speaker": speaker, "start_ms": start_ms, "end_ms": end_ms, "text": text,
            "is_final": is_final, "copilot": copilot,
        }
        if is_final:
            await db.table("call_transcripts").insert(row).execute()
        return {"segment": row, "copilot": copilot}

    async def end_call(
        self, call_id: str, *, disposition: str | None = None, notes: str | None = None,
        duration_secs: int | None = None,
    ) -> dict[str, Any]:
        from app.services.workflows import workflow_service  # avoid circular import

        db = get_db()
        fields: dict[str, Any] = {"status": "completed", "ended_at": now_iso()}
        if disposition:
            fields["disposition"] = disposition
        if notes:
            fields["notes"] = notes
        if duration_secs is not None:
            fields["duration_secs"] = duration_secs
        await db.table("calls").update(fields).eq("id", call_id).execute()
        # Kick off the call-completed workflow (summary + scorecard + follow-up)
        result = await workflow_service.call_completed(call_id)
        return {"call_id": call_id, "status": "completed", **result}


voice_service = VoiceService()
