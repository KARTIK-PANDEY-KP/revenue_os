"""PersonalizationService — hyper-specific outreach grounded in signals + memory.

Inputs: account, contact, recent signals, Cognee memory, persona/pain, tone,
optional best-rep playbook. Outputs: email, LinkedIn message, call opener,
voicemail script, objection responses.
"""
from __future__ import annotations

from typing import Any

from app.core.llm import llm
from app.services.memory import memory_service


def _signal_lines(signals: list[dict[str, Any]]) -> str:
    return "\n".join(f"- [{s.get('type')}] {s.get('title')}: {s.get('summary')}" for s in signals[:5]) \
        or "- (no fresh signals)"


class PersonalizationService:
    async def _context(self, account: dict, contact: dict | None, signals: list[dict]) -> str:
        mem = await memory_service.recall(account["team_id"], account["name"], 5)
        mem_text = "\n".join(f"- {m['text']}" for m in mem) or "- (no prior memory)"
        return (
            f"Account: {account['name']} ({account.get('industry','')}, "
            f"~{account.get('employee_estimate','?')} employees)\n"
            f"Summary: {account.get('description','')}\n"
            f"Why now: {account.get('why_now','')}\n"
            f"Contact: {(contact or {}).get('full_name','the buyer')} — "
            f"{(contact or {}).get('title','')}\n"
            f"Recent signals:\n{_signal_lines(signals)}\n"
            f"Memory:\n{mem_text}"
        )

    async def email(self, account, contact, signals, *, tone="consultative", objective="book a meeting") -> dict:
        ctx = await self._context(account, contact, signals)
        if not llm.enabled:
            return self._mock_email(account, contact, signals, tone)
        out = await llm.structured(
            f"{ctx}\n\nWrite a short, {tone} cold outbound email (60-110 words). Objective: "
            f"{objective}. Open with the most relevant signal, connect to a likely pain, end with "
            "a soft, specific CTA. No fluff, no 'I hope this finds you well'.",
            schema={"type": "object", "properties": {
                "subject": {"type": "string"}, "body": {"type": "string"}},
                "required": ["subject", "body"]},
            tier="balanced", tool_description="Emit the email.",
        )
        return out or self._mock_email(account, contact, signals, tone)

    async def linkedin(self, account, contact, signals, *, tone="consultative") -> dict:
        ctx = await self._context(account, contact, signals)
        if not llm.enabled:
            return {"body": f"Hi {(contact or {}).get('full_name','there').split()[0]} — saw "
                            f"{account['name']}'s recent move ({account.get('why_now','growth')}). "
                            "Curious how you're thinking about account prioritization as you scale. "
                            "Open to a quick note?"}
        body = await llm.complete(
            f"{ctx}\n\nWrite a 1-2 sentence {tone} LinkedIn connection note (<300 chars) "
            "referencing the most relevant signal. Casual, specific, no pitch.",
            tier="fast", max_tokens=160,
        )
        return {"body": body}

    async def call_opener(self, account, contact, signals) -> dict:
        ctx = await self._context(account, contact, signals)
        if not llm.enabled:
            return {"opener": f"Hi {(contact or {}).get('full_name','there').split()[0]}, this is "
                              f"your name from RevenueOS — I saw {account['name']} "
                              f"{account.get('why_now','is growing fast')}, figured prioritizing "
                              "which accounts get rep time might be top of mind. Bad time?"}
        opener = await llm.complete(
            f"{ctx}\n\nWrite a 2-sentence cold-call opener. Natural, references the signal, "
            "ends with a permission-based question. Spoken tone.",
            tier="fast", max_tokens=140,
        )
        return {"opener": opener}

    async def voicemail(self, account, contact, signals) -> dict:
        ctx = await self._context(account, contact, signals)
        if not llm.enabled:
            return {"script": f"Hi {(contact or {}).get('full_name','there').split()[0]}, "
                              f"reaching out about {account['name']}'s recent move — quick idea on "
                              "account prioritization. I'll follow up by email. Talk soon."}
        script = await llm.complete(
            f"{ctx}\n\nWrite a 15-second voicemail script. Reference the signal, give one reason "
            "to call back, mention a follow-up email.",
            tier="fast", max_tokens=140,
        )
        return {"script": script}

    async def objection_responses(self, account, signals) -> list[dict[str, str]]:
        ctx = await self._context(account, None, signals)
        common = ["too expensive", "we already use a competitor", "no time right now",
                  "send me an email", "not a priority"]
        if not llm.enabled:
            return [
                {"objection": "too expensive",
                 "response": "Totally fair — what does a missed quarter of pipeline cost vs the tool? "
                             "Let me show the ROI on rep time."},
                {"objection": "we use Apollo",
                 "response": "Makes sense — we're complementary. We add live buying signals and AI "
                             "prioritization on top of your data."},
                {"objection": "no time",
                 "response": "Understood — 12 minutes, I'll bring the 3 accounts most likely to "
                             "convert this month."},
            ]
        out = await llm.structured(
            f"{ctx}\n\nFor these objections: {common}, write a crisp 1-2 sentence rebuttal each, "
            "grounded in this account's context.",
            schema={"type": "object", "properties": {"responses": {"type": "array", "items": {
                "type": "object", "properties": {
                    "objection": {"type": "string"}, "response": {"type": "string"}},
                "required": ["objection", "response"]}}}, "required": ["responses"]},
            tier="balanced",
        )
        return (out or {}).get("responses", []) if out else []

    def _mock_email(self, account, contact, signals, tone) -> dict:
        first = (contact or {}).get("full_name", "there").split()[0]
        sig = signals[0] if signals else None
        hook = sig["summary"] if sig else account.get("why_now", "your recent growth")
        return {
            "subject": f"Scaling {account['name']}'s motion",
            "body": (
                f"Hi {first},\n\n{hook} Usually when teams hit this stage, the bottleneck becomes "
                f"deciding which accounts deserve rep time first.\n\nWe built RevenueOS to monitor "
                f"account signals, rank high-intent buyers, and generate outreach based on what "
                f"changed this week. Worth a quick 15 minutes to see {account['name']}'s top "
                f"accounts?\n\nBest,\nYour name"
            ),
        }


personalization_service = PersonalizationService()
