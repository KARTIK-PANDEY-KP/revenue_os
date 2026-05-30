"""CopilotService — real-time call suggestions.

Reacts to transcript segments with next-best-action guidance. Fast rule-based
triggers cover the classic objections instantly (no latency); the LLM provides
richer suggestions when enabled.
"""
from __future__ import annotations

import re
from typing import Any

from app.core.llm import llm

# (regex, suggestion, kind) — instant battlecards.
_RULES: list[tuple[str, str, str]] = [
    (r"too expensive|pricing|cost|budget|expensive",
     "Reframe on ROI: ask what a missed quarter of pipeline costs vs the tool. Use the ROI battlecard.",
     "objection:price"),
    (r"\bapollo\b|\boutreach\b|\bsalesloft\b|\bzoominfo\b|already use|we use",
     "Differentiate on live buying signals + AI prioritization layered on top of their existing data.",
     "objection:competitor"),
    (r"no time|busy|bad time|call.* back|later",
     "Acknowledge + compress: offer 12 minutes and promise to bring their 3 highest-intent accounts.",
     "objection:time"),
    (r"send me|email me|send.* over",
     "Agree to send, but anchor a calendar slot now: 'happy to — what does Tuesday look like?'",
     "objection:brushoff"),
    (r"not (a )?priority|not interested|don'?t need",
     "Surface the trigger: tie the conversation back to the specific signal that prompted the call.",
     "objection:priority"),
    (r"who are you|what.* this about|why.* calling",
     "Deliver the one-line signal-based opener: reference what changed at their company this week.",
     "discovery:opener"),
    (r"how (does|do) (it|you)|what (do|does) you do|tell me more",
     "Give the 2-sentence value prop, then ask a discovery question about their prioritization process.",
     "discovery:value"),
    (r"decision|sign off|approv|stakeholder|team",
     "Map the buying committee: ask who else weighs in and what their success criteria are.",
     "discovery:champion"),
    (r"meeting|next week|calendar|schedule|demo",
     "Lock the next step: propose two concrete times and confirm attendees.",
     "next_step:book"),
]


class CopilotService:
    def rule_suggestion(self, text: str) -> dict[str, Any] | None:
        low = text.lower()
        for pattern, suggestion, kind in _RULES:
            if re.search(pattern, low):
                return {"kind": kind, "suggestion": suggestion, "source": "rule"}
        return None

    async def suggest(
        self, text: str, *, account: dict | None = None, history: list[str] | None = None
    ) -> dict[str, Any] | None:
        rule = self.rule_suggestion(text)
        if rule:
            return rule
        if not llm.enabled:
            return None
        ctx = ""
        if account:
            ctx = f"Account: {account.get('name')} — why now: {account.get('why_now','')}. "
        convo = "\n".join(history[-6:]) if history else ""
        suggestion = await llm.complete(
            f"{ctx}Live call. Recent transcript:\n{convo}\nProspect just said: \"{text}\".\n"
            "In one short imperative sentence, tell the rep the next-best move. No preamble.",
            tier="fast", max_tokens=80, temperature=0.3,
        )
        if not suggestion or suggestion.startswith("[mock-llm]"):
            return None
        return {"kind": "ai:next_best", "suggestion": suggestion.strip(), "source": "llm"}


copilot_service = CopilotService()
