"""SequenceService — AI-generated multi-step outbound sequences.

Generates a step plan (email/call/linkedin/follow-up across days), persists
sequence + steps, and launches the orchestrating Trigger.dev workflow.
"""
from __future__ import annotations

from typing import Any

from app.core.db import get_db, new_id, now_iso
from app.core.llm import llm
from app.core.logging import get_logger
from app.integrations.trigger_client import trigger_client
from app.services.outreach import outreach_service

log = get_logger("sequences")

_DEFAULT_PLAN = [
    {"step_order": 1, "channel": "email", "day_offset": 0,
     "instruction": "Personalized email referencing the strongest recent signal."},
    {"step_order": 2, "channel": "call", "day_offset": 2,
     "instruction": "Cold call using the scaling/ROI opener."},
    {"step_order": 3, "channel": "linkedin", "day_offset": 4,
     "instruction": "Short LinkedIn note referencing company growth."},
    {"step_order": 4, "channel": "email", "day_offset": 7,
     "instruction": "Follow-up email sharing a relevant case study."},
    {"step_order": 5, "channel": "call", "day_offset": 10,
     "instruction": "Final call / breakup with a clear CTA."},
]

_PLAN_SCHEMA = {
    "type": "object",
    "properties": {"steps": {"type": "array", "items": {"type": "object", "properties": {
        "step_order": {"type": "integer"}, "channel": {"type": "string",
            "enum": ["email", "call", "linkedin", "sms", "task"]},
        "day_offset": {"type": "integer"}, "instruction": {"type": "string"}},
        "required": ["step_order", "channel", "day_offset", "instruction"]}}},
    "required": ["steps"],
}


class SequenceService:
    async def generate(
        self, team_id: str, account_id: str, *, contact_id: str | None = None,
        persona: str = "VP of Sales", objective: str = "book a 20-min intro",
        tone: str = "consultative", channels: list[str] | None = None,
        approval_mode: str = "manual", owner_id: str | None = None,
    ) -> dict[str, Any]:
        db = get_db()
        acct = (await db.table("accounts").select("*").eq("id", account_id).limit(1).execute()).data
        account = acct[0] if acct else {"name": "Account"}
        channels = channels or ["email", "call", "linkedin"]

        plan = await self._plan(account, persona, objective, channels)

        seq_id = new_id()
        sequence = {
            "id": seq_id, "team_id": team_id, "account_id": account_id, "contact_id": contact_id,
            "owner_id": owner_id, "name": f"{account['name']} — {persona}", "persona": persona,
            "objective": objective, "tone": tone, "channels": channels,
            "approval_mode": approval_mode, "status": "draft",
        }
        await db.table("sequences").insert(sequence).execute()

        steps = []
        for step in plan:
            row = {
                "id": new_id(), "team_id": team_id, "sequence_id": seq_id,
                "step_order": step["step_order"], "channel": step["channel"],
                "day_offset": step["day_offset"], "instruction": step["instruction"],
                "content": {}, "status": "pending",
            }
            await db.table("sequence_steps").insert(row).execute()
            steps.append(row)

        # Pre-generate content for the first email step so the user sees a draft.
        first_email = next((s for s in steps if s["channel"] == "email"), None)
        if first_email:
            msg = await outreach_service.draft(
                team_id, account_id, contact_id=contact_id, channel="email",
                tone=tone, objective=objective, sequence_id=seq_id, step_id=first_email["id"],
            )
            await db.table("sequence_steps").update(
                {"content": {"subject": msg.get("subject"), "body": msg.get("body"),
                             "message_id": msg.get("id")}}
            ).eq("id", first_email["id"]).execute()
            first_email["content"] = {"subject": msg.get("subject"), "body": msg.get("body")}

        return {"sequence": sequence, "steps": steps}

    async def _plan(self, account, persona, objective, channels) -> list[dict]:
        if not llm.enabled:
            return [s for s in _DEFAULT_PLAN if s["channel"] in channels] or _DEFAULT_PLAN
        out = await llm.structured(
            f"Design a {len(channels)}-channel outbound sequence for {account.get('name')} "
            f"(persona: {persona}, objective: {objective}). Allowed channels: {channels}. "
            f"Why now: {account.get('why_now','')}. 4-6 steps over ~10 days, each with a clear "
            "instruction tied to the account's signals. Order by day.",
            schema=_PLAN_SCHEMA, tier="balanced",
        )
        steps = (out or {}).get("steps") if out else None
        return steps or [s for s in _DEFAULT_PLAN if s["channel"] in channels] or _DEFAULT_PLAN

    async def get(self, sequence_id: str) -> dict[str, Any]:
        db = get_db()
        seq = (await db.table("sequences").select("*").eq("id", sequence_id).limit(1).execute()).data
        steps = (await db.table("sequence_steps").select("*").eq("sequence_id", sequence_id)
                 .order("step_order").execute()).data or []
        return {"sequence": seq[0] if seq else None, "steps": steps}

    async def list(self, team_id: str) -> list[dict[str, Any]]:
        db = get_db()
        return (await db.table("sequences").select("*").eq("team_id", team_id)
                .order("created_at", desc=True).execute()).data or []

    async def approve(self, sequence_id: str) -> dict[str, Any]:
        db = get_db()
        res = (await db.table("sequences").update({"status": "pending_approval"})
               .eq("id", sequence_id).execute()).data
        return (res[0] if isinstance(res, list) and res else res) or {}

    async def launch(self, sequence_id: str) -> dict[str, Any]:
        db = get_db()
        seq = (await db.table("sequences").select("*").eq("id", sequence_id).limit(1).execute()).data
        if not seq:
            return {"error": "not found"}
        sequence = seq[0]
        run = await trigger_client.trigger("sequence-run", {"sequence_id": sequence_id,
                                                            "team_id": sequence["team_id"]})
        await db.table("sequences").update({
            "status": "active", "started_at": now_iso(), "trigger_run_id": run["run_id"],
        }).eq("id", sequence_id).execute()
        # mirror a workflow row
        await db.table("workflows").insert({
            "team_id": sequence["team_id"], "account_id": sequence.get("account_id"),
            "kind": "sequence_run", "status": "running", "trigger_run_id": run["run_id"],
            "trigger_task": "sequence-run", "payload": {"sequence_id": sequence_id},
            "started_at": now_iso(),
        }).execute()
        return {"sequence_id": sequence_id, "run": run, "status": "active"}


sequence_service = SequenceService()
