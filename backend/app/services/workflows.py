"""WorkflowService — orchestration logic for the four core workflows.

Each workflow is dispatched to Trigger.dev when configured; otherwise it runs
inline so the demo shows real monitoring/sequence/follow-up results. Every run is
mirrored into the ``workflows`` table for observability, and recommended actions
land in ``tasks``.
"""
from __future__ import annotations

from typing import Any

from app.core.db import get_db, now_iso
from app.core.logging import get_logger
from app.core.tasks import spawn
from app.integrations.trigger_client import trigger_client
from app.services.coaching import coaching_service
from app.services.memory import memory_service
from app.services.outreach import outreach_service

log = get_logger("workflows")


class WorkflowService:
    async def _record(self, team_id, kind, payload, *, account_id=None, run_id=None,
                      status="running", task="") -> str:
        db = get_db()
        row = {
            "team_id": team_id, "account_id": account_id, "kind": kind, "status": status,
            "trigger_run_id": run_id, "trigger_task": task, "payload": payload,
            "started_at": now_iso(),
        }
        inserted = (await db.table("workflows").insert(row).execute()).data
        wf = inserted[0] if isinstance(inserted, list) else inserted or row
        return wf.get("id")

    async def _finish(self, wf_id: str, result: dict, status: str = "completed") -> None:
        db = get_db()
        await db.table("workflows").update(
            {"status": status, "result": result, "finished_at": now_iso()}
        ).eq("id", wf_id).execute()

    # ---- Workflow 1: daily account monitoring --------------------------------
    async def daily_monitor(self, team_id: str, *, limit: int = 5) -> dict[str, Any]:
        from app.services.research import account_research_service

        if trigger_client.enabled:
            run = await trigger_client.trigger("daily-monitor", {"team_id": team_id})
            await self._record(team_id, "daily_monitor", {"team_id": team_id},
                               run_id=run["run_id"], task="daily-monitor")
            return {"dispatched": True, "run": run}

        db = get_db()
        wf_id = await self._record(team_id, "daily_monitor", {"team_id": team_id})
        accounts = (await db.table("accounts").select("*").eq("team_id", team_id)
                    .order("overall_score", desc=True).limit(limit).execute()).data or []
        refreshed, new_signal_count = [], 0
        for a in accounts:
            before = {s["dedupe_hash"] for s in
                      (await db.table("signals").select("*").eq("account_id", a["id"]).execute()).data or []}
            res = await account_research_service.research(team_id, a["name"], owner_id=a.get("owner_id"))
            after = res["signals"]
            new = [s for s in after if s.get("dedupe_hash") not in before]
            new_signal_count += len(new)
            for s in new:
                await self.signal_detected(s.get("id"), signal=s)
            refreshed.append({"account": a["name"], "new_signals": len(new),
                              "score": res["account"].get("overall_score")})
        result = {"accounts_monitored": len(accounts), "new_signals": new_signal_count,
                  "detail": refreshed}
        await self._finish(wf_id, result)
        return result

    # ---- Workflow 2: new signal detected -------------------------------------
    async def signal_detected(self, signal_id: str | None, *, signal: dict | None = None) -> dict[str, Any]:
        db = get_db()
        if signal is None and signal_id:
            res = (await db.table("signals").select("*").eq("id", signal_id).limit(1).execute()).data
            signal = res[0] if res else None
        if not signal:
            return {"error": "signal not found"}

        team_id, account_id = signal["team_id"], signal["account_id"]
        confidence = signal.get("confidence", 0)
        impact = signal.get("impact_score", 0)
        priority_score = (confidence + impact) / 2
        actions: dict[str, Any] = {"signal": signal["title"], "created": []}

        # High confidence -> create outreach draft
        if confidence >= 75:
            draft = await outreach_service.draft(team_id, account_id, channel="email",
                                                 objective="book a meeting")
            actions["created"].append({"type": "draft", "id": draft.get("id")})

        # Very high priority -> create a call task
        if priority_score >= 80:
            task = {
                "team_id": team_id, "account_id": account_id, "signal_id": signal.get("id"),
                "kind": "call", "status": "open", "priority": 1,
                "title": f"Call about: {signal['title']}",
                "detail": signal.get("recommended_action") or signal["summary"],
                "due_at": now_iso(),
            }
            inserted = (await db.table("tasks").insert(task).execute()).data
            actions["created"].append({"type": "task", "id":
                                       (inserted[0] if isinstance(inserted, list) else inserted or {}).get("id")})
        return actions

    # ---- Workflow 3: sequence automation -------------------------------------
    async def sequence_run(self, sequence_id: str) -> dict[str, Any]:
        db = get_db()
        seq = (await db.table("sequences").select("*").eq("id", sequence_id).limit(1).execute()).data
        if not seq:
            return {"error": "sequence not found"}
        sequence = seq[0]
        steps = (await db.table("sequence_steps").select("*").eq("sequence_id", sequence_id)
                 .order("step_order").execute()).data or []
        executed = []
        for step in steps:
            if step["channel"] in ("email", "linkedin", "sms"):
                msg = await outreach_service.draft(
                    sequence["team_id"], sequence["account_id"],
                    contact_id=sequence.get("contact_id"), channel=step["channel"],
                    tone=sequence.get("tone", "consultative"), sequence_id=sequence_id,
                    step_id=step["id"],
                )
                await db.table("sequence_steps").update(
                    {"status": "scheduled", "content": {"message_id": msg.get("id"),
                                                        "subject": msg.get("subject"),
                                                        "body": msg.get("body")}}
                ).eq("id", step["id"]).execute()
                executed.append({"step": step["step_order"], "channel": step["channel"],
                                 "message_id": msg.get("id")})
            else:  # call / task -> create a task
                await db.table("tasks").insert({
                    "team_id": sequence["team_id"], "account_id": sequence["account_id"],
                    "contact_id": sequence.get("contact_id"), "sequence_id": sequence_id,
                    "kind": "call" if step["channel"] == "call" else "followup",
                    "status": "open", "priority": 2,
                    "title": f"Sequence step {step['step_order']}: {step['channel']}",
                    "detail": step.get("instruction"),
                }).execute()
                await db.table("sequence_steps").update({"status": "scheduled"}).eq("id", step["id"]).execute()
                executed.append({"step": step["step_order"], "channel": step["channel"]})
        return {"sequence_id": sequence_id, "executed": executed}

    # ---- Workflow 4: call completed ------------------------------------------
    async def call_completed(self, call_id: str) -> dict[str, Any]:
        db = get_db()
        call = (await db.table("calls").select("*").eq("id", call_id).limit(1).execute()).data
        if not call:
            return {"error": "call not found"}
        call = call[0]
        team_id, account_id = call["team_id"], call.get("account_id")

        summary = await coaching_service.summarize(call_id)
        scorecard = await coaching_service.scorecard(call_id)
        await db.table("calls").update({"summary": summary}).eq("id", call_id).execute()
        spawn(memory_service.ingest_call(call, summary), name="cognee:call")

        followup = None
        if account_id:
            followup = await outreach_service.draft(
                team_id, account_id, contact_id=call.get("contact_id"), channel="email",
                objective="follow up after the call referencing what was discussed",
            )
            await db.table("calls").update(
                {"followup": {"message_id": followup.get("id")}}).eq("id", call_id).execute()
            await db.table("tasks").insert({
                "team_id": team_id, "account_id": account_id, "contact_id": call.get("contact_id"),
                "call_id": call_id, "kind": "followup", "status": "open", "priority": 2,
                "title": "Send post-call follow-up email",
                "detail": "Follow up referencing the agreed next step.",
            }).execute()

        return {"summary": summary, "scorecard": scorecard,
                "followup_message_id": followup.get("id") if followup else None}


workflow_service = WorkflowService()
