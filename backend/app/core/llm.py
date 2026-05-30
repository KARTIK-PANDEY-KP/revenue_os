"""Claude LLM client with tiered model routing + structured output.

Tiers map to task complexity (cost-aware routing):
  deep     -> Opus      (research synthesis, hard reasoning)
  balanced -> Sonnet    (signal extraction, personalization, scoring)
  fast     -> Haiku     (live call copilot, quick classification)

When ANTHROPIC_API_KEY is absent (or REVENUEOS_FORCE_MOCK), callers should prefer
their own rich domain mocks. ``llm.enabled`` exposes that state. The structured/
complete methods still degrade gracefully so nothing crashes.
"""
from __future__ import annotations

import json
from typing import Any, Literal

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger("llm")

Tier = Literal["deep", "balanced", "fast"]


class LLMClient:
    def __init__(self) -> None:
        self._client = None
        if settings.llm_enabled:
            try:
                from anthropic import AsyncAnthropic

                self._client = AsyncAnthropic(api_key=settings.anthropic_api_key)
                log.info("Claude LLM enabled.")
            except Exception as exc:  # pragma: no cover
                log.error("Anthropic init failed (%s); LLM disabled.", exc)

    @property
    def enabled(self) -> bool:
        return self._client is not None

    def _model(self, tier: Tier) -> str:
        return {
            "deep": settings.llm_model_deep,
            "balanced": settings.llm_model_balanced,
            "fast": settings.llm_model_fast,
        }[tier]

    async def complete(
        self,
        prompt: str,
        *,
        system: str | None = None,
        tier: Tier = "balanced",
        max_tokens: int = 1500,
        temperature: float = 0.5,
    ) -> str:
        if not self.enabled:
            return f"[mock-llm] {prompt[:120]}"
        resp = await self._client.messages.create(
            model=self._model(tier),
            max_tokens=max_tokens,
            temperature=temperature,
            system=system or "You are RevenueOS, an expert GTM/sales-intelligence assistant.",
            messages=[{"role": "user", "content": prompt}],
        )
        return "".join(b.text for b in resp.content if getattr(b, "type", None) == "text").strip()

    async def structured(
        self,
        prompt: str,
        *,
        schema: dict[str, Any],
        system: str | None = None,
        tier: Tier = "balanced",
        max_tokens: int = 2000,
        tool_name: str = "emit",
        tool_description: str = "Emit the structured result.",
    ) -> dict[str, Any] | None:
        """Force Claude to return JSON matching ``schema`` via tool use.

        Returns None in mock mode — callers supply their own domain mock.
        """
        if not self.enabled:
            return None
        resp = await self._client.messages.create(
            model=self._model(tier),
            max_tokens=max_tokens,
            system=system or "You are RevenueOS, an expert GTM/sales-intelligence assistant.",
            tools=[{"name": tool_name, "description": tool_description, "input_schema": schema}],
            tool_choice={"type": "tool", "name": tool_name},
            messages=[{"role": "user", "content": prompt}],
        )
        for block in resp.content:
            if getattr(block, "type", None) == "tool_use" and block.name == tool_name:
                return dict(block.input)
        # Fallback: try to parse text as JSON
        text = "".join(b.text for b in resp.content if getattr(b, "type", None) == "text")
        try:
            return json.loads(text)
        except Exception:
            return None


llm = LLMClient()
