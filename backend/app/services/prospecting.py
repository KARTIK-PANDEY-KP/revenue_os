"""ProspectingService — ICP query -> discovered, researched, ranked accounts.

Flow: ICP query -> Bright Data discovery -> per-company research (account +
people + signals + scoring + memory) -> ranked list with suggested openers.
"""
from __future__ import annotations

from typing import Any

from app.core.llm import llm
from app.core.logging import get_logger
from app.integrations.brightdata import brightdata
from app.services.research import account_research_service

log = get_logger("prospecting")


class ProspectingService:
    async def search(self, team_id: str, query: str, *, limit: int = 4, owner_id: str | None = None
                     ) -> dict[str, Any]:
        candidates = await self._discover(query, limit)
        results = []
        for cand in candidates[:limit]:
            try:
                res = await account_research_service.research(team_id, cand["name"], owner_id=owner_id)
                account = res["account"]
                contacts = res["contacts"]
                opener = contacts[0].get("suggested_opener") if contacts else None
                results.append({
                    "account": account,
                    "decision_makers": contacts[:3],
                    "signals": res["signals"][:3],
                    "suggested_opener": opener or account.get("recommended_action"),
                    "confidence": account.get("overall_score"),
                })
            except Exception as exc:  # pragma: no cover
                log.error("prospect research failed for %s: %s", cand.get("name"), exc)
        results.sort(key=lambda r: r["account"].get("overall_score", 0), reverse=True)
        return {"query": query, "count": len(results), "results": results}

    async def _discover(self, query: str, limit: int) -> list[dict[str, Any]]:
        """Turn an ICP query into candidate company names."""
        # If the LLM is available, extract clean company candidates / criteria.
        names: list[str] = []
        if llm.enabled:
            out = await llm.structured(
                f"From this prospecting request, list up to {limit} real, well-known companies "
                f"that best match: \"{query}\". Prefer companies that plausibly show the described "
                "buying behavior.",
                schema={"type": "object", "properties": {"companies": {"type": "array",
                    "items": {"type": "string"}}}, "required": ["companies"]},
                tier="balanced",
            )
            names = (out or {}).get("companies", []) if out else []
        if not names:
            similar = await brightdata.find_similar_companies(query, limit=limit)
            names = [c["name"] for c in similar]
        seen, uniq = set(), []
        for n in names:
            if n.lower() not in seen:
                seen.add(n.lower())
                uniq.append({"name": n})
        return uniq


prospecting_service = ProspectingService()
