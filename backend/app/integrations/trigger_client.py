"""Trigger.dev — workflow/orchestration dispatch.

The backend *dispatches* tasks to Trigger.dev over its REST API; the actual
long-running logic lives in the TypeScript project under ``/trigger`` (which calls
back into this backend's internal API to do the heavy lifting).

In mock mode (no Trigger key), dispatch returns a synthetic run handle and the
``WorkflowService`` executes the equivalent logic inline so the demo still shows
monitoring/sequence/follow-up results.

Docs: https://trigger.dev/docs/management/runs/trigger
"""
from __future__ import annotations

import time
from typing import Any

import httpx

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger("trigger")


class TriggerClient:
    def __init__(self) -> None:
        self._enabled = settings.trigger_enabled
        self._key = settings.trigger_access_token or settings.trigger_secret_key
        if not self._enabled:
            log.warning("Trigger.dev disabled — workflows run inline (mock orchestration).")

    @property
    def enabled(self) -> bool:
        return self._enabled

    async def trigger(self, task_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        """Dispatch a Trigger.dev task. Returns {run_id, status, mock}."""
        settings.require("Trigger.dev", self._enabled)
        if not self._enabled:
            return {"run_id": f"mock-run-{task_id}-{int(time.time())}", "status": "queued", "mock": True}
        url = f"{settings.trigger_api_url}/api/v1/tasks/{task_id}/trigger"
        headers = {"Authorization": f"Bearer {self._key}", "Content-Type": "application/json"}
        try:
            async with httpx.AsyncClient(timeout=30) as c:
                r = await c.post(url, json={"payload": payload}, headers=headers)
                r.raise_for_status()
                data = r.json()
                return {"run_id": data.get("id"), "status": "queued", "mock": False}
        except Exception as exc:  # pragma: no cover
            log.error("Trigger dispatch failed (%s); falling back to inline.", exc)
            return {"run_id": f"mock-run-{task_id}-{int(time.time())}", "status": "queued", "mock": True}

    async def get_run(self, run_id: str) -> dict[str, Any]:
        if not self._enabled or run_id.startswith("mock-run-"):
            return {"run_id": run_id, "status": "completed", "mock": True}
        url = f"{settings.trigger_api_url}/api/v1/runs/{run_id}"
        headers = {"Authorization": f"Bearer {self._key}"}
        try:
            async with httpx.AsyncClient(timeout=30) as c:
                r = await c.get(url, headers=headers)
                r.raise_for_status()
                return r.json()
        except Exception as exc:  # pragma: no cover
            log.error("Trigger get_run failed: %s", exc)
            return {"run_id": run_id, "status": "unknown"}


trigger_client = TriggerClient()
