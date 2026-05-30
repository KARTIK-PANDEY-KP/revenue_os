"""Speechmatics — real-time speech-to-text.

The browser streams mic audio directly to Speechmatics' real-time WebSocket using
a **short-lived JWT** that the backend mints (so the long-lived API key never
touches the client). When Speechmatics isn't configured, ``mock_transcript`` feeds
the dialer a scripted sales conversation so the copilot + coaching demo still runs.

Docs: https://docs.speechmatics.com/api-ref/realtime-transcription-websocket
"""
from __future__ import annotations

from typing import Any, AsyncIterator

import httpx

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger("speechmatics")

# A scripted demo call used in mock mode. The "rep" turns are spoken by the
# RevenueOS AI voice agent (the UI relabels this as "AI agent"; the label stays
# "rep" so talk-ratio / scorecard logic keeps working). Includes the objection
# phrases the copilot reacts to ("too expensive", "we use Apollo").
MOCK_SCRIPT: list[dict[str, Any]] = [
    {"speaker": "rep", "text": "Hi Jordan — this is the RevenueOS AI assistant calling on behalf of "
                               "the sales team. Is now an okay moment for a quick minute?", "ms": 0},
    {"speaker": "prospect", "text": "I've got a couple minutes, go ahead.", "ms": 3200},
    {"speaker": "rep", "text": "Thanks. I noticed Cursor has been hiring a lot of enterprise reps "
                               "lately, so I figured account prioritization might be top of mind right now.", "ms": 6000},
    {"speaker": "prospect", "text": "Yeah, we're ramping the team. Honestly though, this sounds a "
                                    "bit too expensive for where we are.", "ms": 12000},
    {"speaker": "rep", "text": "That's a fair concern about cost — let me put it in context for you.", "ms": 17000},
    {"speaker": "prospect", "text": "And we already use Apollo for a lot of this.", "ms": 20000},
    {"speaker": "rep", "text": "Makes sense — a lot of teams start with Apollo, and we sit alongside it.", "ms": 24000},
    {"speaker": "prospect", "text": "What would make this different for us?", "ms": 27000},
    {"speaker": "rep", "text": "Great question. The short version: I surface live buying signals and "
                               "rank exactly who your reps should call today, so new hires don't burn ramp time.", "ms": 30000},
    {"speaker": "prospect", "text": "Okay, that's interesting. Send me something and let's find time "
                                    "next week.", "ms": 36000},
    {"speaker": "rep", "text": "Perfect — I'll email you a short brief and a few times for next week, "
                               "and I'll note that pricing and the Apollo overlap came up. Thanks, Jordan.", "ms": 40000},
]


class SpeechmaticsClient:
    def __init__(self) -> None:
        self._enabled = settings.speechmatics_enabled
        if not self._enabled:
            log.warning("Speechmatics disabled — dialer uses a scripted mock transcript.")

    @property
    def enabled(self) -> bool:
        return self._enabled

    @property
    def rt_url(self) -> str:
        return settings.speechmatics_rt_url

    async def create_temp_token(self, *, ttl_secs: int = 3600) -> dict[str, Any]:
        """Mint a short-lived JWT for client-side real-time transcription."""
        settings.require("Speechmatics", self._enabled)
        if not self._enabled:
            return {"token": "mock-speechmatics-jwt", "url": self.rt_url, "mock": True}
        try:
            async with httpx.AsyncClient(timeout=30) as c:
                r = await c.post(
                    "https://mp.speechmatics.com/v1/api_keys?type=rt",
                    headers={"Authorization": f"Bearer {settings.speechmatics_api_key}",
                             "Content-Type": "application/json"},
                    json={"ttl": ttl_secs},
                )
                r.raise_for_status()
                return {"token": r.json().get("key_value"), "url": self.rt_url, "mock": False}
        except Exception as exc:  # pragma: no cover
            log.error("Speechmatics temp token failed (%s); using mock.", exc)
            return {"token": "mock-speechmatics-jwt", "url": self.rt_url, "mock": True}

    def rt_config(self, *, language: str = "en") -> dict[str, Any]:
        """StartRecognition config the browser uses for the RT WebSocket."""
        return {
            "type": "transcription",
            "transcription_config": {
                "language": language,
                "enable_partials": True,
                "max_delay": 2,
                "diarization": "speaker",
                "operating_point": "enhanced",
            },
        }

    async def mock_transcript(self) -> AsyncIterator[dict[str, Any]]:
        """Yield scripted transcript segments (used by the dialer in mock mode)."""
        for seg in MOCK_SCRIPT:
            yield {**seg, "is_final": True}


speechmatics_client = SpeechmaticsClient()
