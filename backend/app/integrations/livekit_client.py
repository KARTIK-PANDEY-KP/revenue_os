"""LiveKit — real-time voice/call infrastructure.

The backend mints short-lived access tokens so the browser dialer can join a
call room. When LiveKit isn't configured we still return a well-formed (unsigned)
mock token + room so the dialer UI renders and the demo flows.
"""
from __future__ import annotations

import time
from typing import Any

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger("livekit")


class LiveKitClient:
    def __init__(self) -> None:
        self._enabled = settings.livekit_enabled
        if not self._enabled:
            log.warning("LiveKit disabled — issuing mock room tokens.")

    @property
    def enabled(self) -> bool:
        return self._enabled

    @property
    def url(self) -> str:
        return settings.livekit_url or "wss://mock.livekit.local"

    def room_name(self, call_id: str) -> str:
        return f"revenueos-call-{call_id}"

    def create_token(self, *, call_id: str, identity: str, name: str | None = None) -> dict[str, Any]:
        settings.require("LiveKit", self._enabled)
        room = self.room_name(call_id)
        if not self._enabled:
            return {
                "token": f"mock-token.{call_id}.{int(time.time())}",
                "url": self.url,
                "room": room,
                "mock": True,
            }
        from livekit import api  # type: ignore

        token = (
            api.AccessToken(settings.livekit_api_key, settings.livekit_api_secret)
            .with_identity(identity)
            .with_name(name or identity)
            .with_grants(api.VideoGrants(room_join=True, room=room, can_publish=True,
                                         can_subscribe=True))
            .to_jwt()
        )
        return {"token": token, "url": self.url, "room": room, "mock": False}


livekit_client = LiveKitClient()
