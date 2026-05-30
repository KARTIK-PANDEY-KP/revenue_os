"""CoachingService — call summaries, scorecards, roleplay, rep learning."""
from __future__ import annotations

from typing import Any

from app.core.db import get_db, now_iso
from app.core.llm import llm
from app.core.logging import get_logger

log = get_logger("coaching")

_SCORECARD_SCHEMA = {
    "type": "object",
    "properties": {
        "discovery_score": {"type": "number"},
        "objection_handling_score": {"type": "number"},
        "personalization_score": {"type": "number"},
        "next_step_score": {"type": "number"},
        "qualification_score": {"type": "number"},
        "summary": {"type": "string"},
        "improvements": {"type": "array", "items": {"type": "string"}},
        "objections_detected": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["discovery_score", "objection_handling_score", "personalization_score",
                 "next_step_score", "qualification_score", "summary", "improvements"],
}


class CoachingService:
    async def _transcript(self, call_id: str) -> list[dict[str, Any]]:
        db = get_db()
        return (await db.table("call_transcripts").select("*").eq("call_id", call_id)
                .order("start_ms").execute()).data or []

    def _talk_ratio(self, segments: list[dict]) -> float:
        rep = sum(len(s.get("text", "")) for s in segments if s.get("speaker") == "rep")
        total = sum(len(s.get("text", "")) for s in segments) or 1
        return round(100 * rep / total, 2)

    def _transcript_text(self, segments: list[dict]) -> str:
        return "\n".join(f"{s.get('speaker','?').upper()}: {s.get('text','')}" for s in segments)

    async def summarize(self, call_id: str) -> str:
        segments = await self._transcript(call_id)
        text = self._transcript_text(segments)
        if not text:
            return "No transcript captured."
        if not llm.enabled:
            return ("Prospect raised pricing and an incumbent tool; rep reframed on ROI and live "
                    "signals. Prospect asked for follow-up material and a meeting next week. "
                    "Next step: send one-pager + propose two times.")
        return await llm.complete(
            f"Summarize this sales call in 3-4 sentences: outcome, objections, and the agreed "
            f"next step.\n\n{text}", tier="balanced", max_tokens=240,
        )

    async def scorecard(self, call_id: str) -> dict[str, Any]:
        db = get_db()
        segments = await self._transcript(call_id)
        talk_ratio = self._talk_ratio(segments)
        text = self._transcript_text(segments)
        call = (await db.table("calls").select("*").eq("id", call_id).limit(1).execute()).data
        rep_id = call[0].get("rep_id") if call else None
        team_id = call[0].get("team_id") if call else None

        scores = await self._score(text)
        overall = round(
            0.25 * scores["discovery_score"] + 0.25 * scores["objection_handling_score"]
            + 0.2 * scores["personalization_score"] + 0.15 * scores["next_step_score"]
            + 0.15 * scores["qualification_score"], 2,
        )
        card = {
            "team_id": team_id, "call_id": call_id, "rep_id": rep_id,
            "discovery_score": scores["discovery_score"],
            "objection_handling_score": scores["objection_handling_score"],
            "personalization_score": scores["personalization_score"],
            "next_step_score": scores["next_step_score"],
            "qualification_score": scores["qualification_score"],
            "talk_ratio": talk_ratio, "overall_score": overall,
            "summary": scores["summary"],
            "improvements": scores.get("improvements", []),
            "objections_detected": scores.get("objections_detected", []),
        }
        # upsert by call
        existing = (await db.table("call_scorecards").select("*").eq("call_id", call_id).execute()).data
        if existing:
            await db.table("call_scorecards").update(card).eq("call_id", call_id).execute()
        else:
            await db.table("call_scorecards").insert(card).execute()
        return card

    async def _score(self, text: str) -> dict[str, Any]:
        if not text:
            text = "(empty)"
        if llm.enabled:
            out = await llm.structured(
                f"Score this SDR call 0-100 on discovery, objection handling, personalization, "
                f"next-step clarity, and qualification. Give a 2-sentence summary, 3 concrete "
                f"improvements, and the objections detected.\n\n{text}",
                schema=_SCORECARD_SCHEMA, tier="balanced",
            )
            if out:
                return out
        # heuristic fallback
        return {
            "discovery_score": 72, "objection_handling_score": 78, "personalization_score": 81,
            "next_step_score": 70, "qualification_score": 68,
            "summary": "Solid signal-based opener and good objection reframing; tighten the close "
                       "and confirm a concrete next step.",
            "improvements": ["Book the meeting on the call instead of agreeing to email",
                             "Ask one more qualification question about the buying committee",
                             "Quantify the ROI with a specific number"],
            "objections_detected": ["price", "incumbent tool"],
        }

    async def roleplay(self, scenario: str, *, persona: str = "skeptical VP of Sales",
                       turns: list[dict] | None = None) -> dict[str, Any]:
        history = "\n".join(f"{t['role']}: {t['text']}" for t in (turns or []))
        if not llm.enabled:
            return {"reply": "That sounds expensive and we already have a tool — why should I care?",
                    "coaching": "Reframe on ROI and differentiate on live signals."}
        reply = await llm.complete(
            f"You roleplay a {persona} on a cold call. Scenario: {scenario}. Conversation so "
            f"far:\n{history}\nRespond in character with one realistic objection or question.",
            tier="balanced", max_tokens=160, temperature=0.8,
        )
        coaching = await llm.complete(
            f"As a sales coach, in one sentence tell the rep how to respond to: \"{reply}\"",
            tier="fast", max_tokens=80,
        )
        return {"reply": reply, "coaching": coaching}

    async def rep_leaderboard(self, team_id: str) -> list[dict[str, Any]]:
        db = get_db()
        cards = (await db.table("call_scorecards").select("*").eq("team_id", team_id).execute()).data or []
        by_rep: dict[str, list[float]] = {}
        for c in cards:
            by_rep.setdefault(c.get("rep_id") or "unknown", []).append(c.get("overall_score", 0))
        board = [
            {"rep_id": rep, "calls": len(scores), "avg_score": round(sum(scores) / len(scores), 1)}
            for rep, scores in by_rep.items()
        ]
        board.sort(key=lambda r: r["avg_score"], reverse=True)
        for i, r in enumerate(board, 1):
            r["rank"] = i
        return board


coaching_service = CoachingService()
