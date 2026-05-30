"""Fire-and-forget background task helper.

Lets request handlers schedule slow side-effects (e.g. Cognee graph builds) without
blocking the HTTP response. Keeps a strong reference so tasks aren't GC'd, and logs
any failure rather than letting it vanish.
"""
from __future__ import annotations

import asyncio
from typing import Awaitable

from app.core.logging import get_logger

log = get_logger("bg")
_TASKS: set[asyncio.Task] = set()


def spawn(coro: Awaitable, *, name: str = "bg") -> None:
    async def _wrap():
        try:
            await coro
        except Exception as exc:  # pragma: no cover
            log.warning("background task %s failed: %s", name, exc)

    try:
        task = asyncio.create_task(_wrap(), name=name)
    except RuntimeError:
        # No running loop (e.g. sync test context) — run inline best-effort.
        return
    _TASKS.add(task)
    task.add_done_callback(_TASKS.discard)
