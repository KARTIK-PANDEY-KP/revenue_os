"""MemoryService — the Cognee-backed knowledge layer.

Stores every company / contact / signal / call / email as memory + typed graph
edges, and answers "why is X a priority?" by recalling related context. Also
reconstructs an account timeline from Postgres (signals + calls + messages).
"""
from __future__ import annotations

from typing import Any

from app.core.config import IntegrationNotConfigured
from app.core.db import get_db
from app.core.llm import llm
from app.integrations.cognee_client import cognee_client
from app.core.logging import get_logger

log = get_logger("memory")


class MemoryService:
    """Cognee-backed memory. When Cognee isn't configured, writes are skipped
    (logged, never faked) so the rest of the pipeline keeps working on real data."""

    def _ds(self, team_id: str) -> str:
        return f"team_{team_id}"

    async def _remember(self, *args, **kwargs) -> None:
        try:
            await cognee_client.remember(*args, **kwargs)
        except IntegrationNotConfigured:
            log.debug("Cognee not configured — skipping memory write.")

    async def _relate(self, *args) -> None:
        try:
            await cognee_client.relate(*args)
        except IntegrationNotConfigured:
            pass

    async def ingest_account(self, account: dict[str, Any]) -> None:
        text = (
            f"Company {account['name']} ({account.get('domain','')}) — "
            f"{account.get('industry','')}, ~{account.get('employee_estimate','?')} employees. "
            f"{account.get('description','')}. Why now: {account.get('why_now','')}. "
            f"Scores: overall={account.get('overall_score')}, fit={account.get('fit_score')}, "
            f"intent={account.get('intent_score')}, timing={account.get('timing_score')}."
        )
        await self._remember(text, dataset=self._ds(account["team_id"]),
                             meta={"kind": "company", "account_id": account["id"]})

    async def ingest_signal(self, signal: dict[str, Any], account_name: str) -> None:
        text = (
            f"Signal for {account_name}: [{signal['type']}] {signal['title']} — "
            f"{signal['summary']} (confidence {signal.get('confidence')}, "
            f"impact {signal.get('impact_score')}). Action: {signal.get('recommended_action','')}."
        )
        await self._remember(text, dataset=self._ds(signal["team_id"]),
                             meta={"kind": "signal", "signal_id": signal["id"],
                                   "account_id": signal["account_id"]})
        await self._relate(signal["account_id"], "HAS_SIGNAL", signal["id"])

    async def ingest_contact(self, contact: dict[str, Any], account_name: str) -> None:
        text = (f"Person {contact['full_name']} — {contact.get('title','')} at {account_name}. "
                f"Decision maker: {contact.get('is_decision_maker')}.")
        await self._remember(text, dataset=self._ds(contact["team_id"]),
                             meta={"kind": "person", "contact_id": contact["id"]})
        await self._relate(contact["id"], "WORKS_AT", contact["account_id"])

    async def ingest_call(self, call: dict[str, Any], summary: str) -> None:
        text = (f"Call ({call.get('disposition','')}) for account {call.get('account_id')}: {summary}")
        await self._remember(text, dataset=self._ds(call["team_id"]),
                             meta={"kind": "call", "call_id": call["id"],
                                   "account_id": call.get("account_id")})

    async def ingest_message(self, message: dict[str, Any]) -> None:
        text = (f"{message['channel']} sent: {message.get('subject','')} — {message.get('body','')[:240]}")
        await self._remember(text, dataset=self._ds(message["team_id"]),
                             meta={"kind": "email", "message_id": message["id"],
                                   "account_id": message.get("account_id")})

    async def ingest_research(self, account: dict[str, Any], signals: list[dict[str, Any]],
                              contacts: list[dict[str, Any]]) -> None:
        """Batch a whole research result into ONE memory document + graph build.

        Cognee's cognify is expensive (an LLM graph extraction), so we combine the
        account, its signals, and key people into a single document and cognify once
        instead of N times.
        """
        sig_lines = "\n".join(
            f"- [{s['type']}] {s['title']}: {s['summary']} (confidence {s.get('confidence')}, "
            f"impact {s.get('impact_score')}; action: {s.get('recommended_action','')})"
            for s in signals
        ) or "- (no signals)"
        people_lines = "\n".join(
            f"- {c['full_name']} — {c.get('title','')}"
            f"{' (decision maker)' if c.get('is_decision_maker') else ''}"
            for c in contacts
        ) or "- (no contacts)"
        doc = (
            f"# Company: {account['name']} ({account.get('domain','')})\n"
            f"Industry: {account.get('industry','')}. Employees: {account.get('employee_estimate','?')}.\n"
            f"Summary: {account.get('description','')}\n"
            f"Why now: {account.get('why_now','')}\n"
            f"Scores — overall {account.get('overall_score')}, fit {account.get('fit_score')}, "
            f"intent {account.get('intent_score')}, timing {account.get('timing_score')}, "
            f"risk {account.get('risk_penalty')}.\n\n"
            f"## Buying signals\n{sig_lines}\n\n## Key people\n{people_lines}\n"
        )
        await self._remember(doc, dataset=self._ds(account["team_id"]),
                             meta={"kind": "research", "account_id": account["id"]})

    async def recall(self, team_id: str, query: str, limit: int = 8) -> list[dict[str, Any]]:
        try:
            return await cognee_client.search(query, dataset=self._ds(team_id), limit=limit)
        except IntegrationNotConfigured:
            return []

    async def why_now(self, team_id: str, account_name: str) -> dict[str, Any]:
        """Answer 'why is <account> a priority?' grounded in recalled memory."""
        memories = await self.recall(team_id, f"why is {account_name} a high priority account", 10)
        context = "\n".join(f"- {m['text']}" for m in memories) or "(no prior memory yet)"
        if llm.enabled:
            answer = await llm.complete(
                f"Account: {account_name}\nRecalled memory:\n{context}\n\n"
                "In 2-3 crisp sentences, explain why this account is a priority right now "
                "and the single best next action. Be specific and reference the signals.",
                tier="balanced", max_tokens=220,
            )
        else:
            answer = (f"{account_name} is a priority due to recent buying signals "
                      f"({len(memories)} recalled). Best next action: contact the decision maker "
                      "referencing the most recent signal.")
        return {"answer": answer, "evidence": memories}

    async def timeline(self, team_id: str, account_id: str) -> list[dict[str, Any]]:
        """Chronological account history from Postgres (signals + calls + messages + tasks)."""
        db = get_db()
        events: list[dict[str, Any]] = []

        sigs = (await db.table("signals").select("*").eq("account_id", account_id).execute()).data or []
        for s in sigs:
            events.append({"at": s.get("detected_at"), "type": "signal",
                           "icon": s.get("type"), "title": s["title"], "detail": s["summary"],
                           "url": s.get("source_url")})

        calls = (await db.table("calls").select("*").eq("account_id", account_id).execute()).data or []
        for c in calls:
            events.append({"at": c.get("ended_at") or c.get("started_at") or c.get("created_at"),
                           "type": "call", "title": f"Call — {c.get('disposition') or c.get('status')}",
                           "detail": c.get("summary") or "", "id": c["id"]})

        msgs = (await db.table("outreach_messages").select("*").eq("account_id", account_id).execute()).data or []
        for m in msgs:
            events.append({"at": m.get("sent_at") or m.get("created_at"), "type": "message",
                           "title": f"{m['channel'].title()} — {m.get('subject') or 'message'}",
                           "detail": (m.get("body") or "")[:160], "id": m["id"]})

        events = [e for e in events if e.get("at")]
        events.sort(key=lambda e: e["at"], reverse=True)
        return events


memory_service = MemoryService()
