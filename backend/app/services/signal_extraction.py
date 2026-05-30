"""SignalExtractionService — normalize raw web evidence into GTM signals.

Uses Claude (structured tool output) to read research/evidence and emit typed
signals; falls back to a deterministic heuristic mapping over the mock evidence
when the LLM is unavailable. Handles dedupe + confidence/impact + recommended
action, and attributes each signal to its source.
"""
from __future__ import annotations

import re
from typing import Any

from app.core.llm import llm
from app.core.logging import get_logger

log = get_logger("signals")

VALID_TYPES = {
    "hiring", "funding", "pricing", "product", "executive", "expansion", "competitor",
    "partnership", "techstack", "complaint", "event", "news", "headcount", "layoff",
    "revenue_proxy", "investor", "breach", "compliance", "trust_center", "risk",
}

_SIGNAL_SCHEMA = {
    "type": "object",
    "properties": {
        "signals": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "type": {"type": "string", "enum": sorted(VALID_TYPES)},
                    "title": {"type": "string"},
                    "summary": {"type": "string"},
                    "source_url": {"type": "string"},
                    "confidence": {"type": "number"},
                    "impact_score": {"type": "number"},
                    "recommended_action": {"type": "string"},
                },
                "required": ["type", "title", "summary", "confidence", "impact_score",
                             "recommended_action"],
            },
        }
    },
    "required": ["signals"],
}


def dedupe_hash(signal_type: str, title: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return f"{signal_type}:{slug}"


class SignalExtractionService:
    async def extract(
        self, company_name: str, research: dict[str, Any], evidence: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        if llm.enabled:
            llm_signals = await self._extract_llm(company_name, research, evidence)
            if llm_signals:
                return self._finalize(llm_signals)
        return self._finalize(self._extract_heuristic(company_name, research, evidence))

    async def _extract_llm(
        self, company_name: str, research: dict[str, Any], evidence: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        ev_text = "\n".join(
            f"- ({e.get('kind','?')}) {e.get('title','')}: {e.get('snippet','')} [{e.get('url','')}]"
            for e in evidence
        ) or "(no search evidence)"
        research_text = (
            f"Industry: {research.get('industry')}\nProducts: {research.get('products')}\n"
            f"Pricing: {research.get('pricing')}\nRoles open: {research.get('roles')}\n"
            f"News: {[n.get('title') for n in research.get('news', [])]}"
        )
        # Include excerpts of the ACTUAL scraped pages (homepage, pricing, careers,
        # about, blog) so Claude grounds signals in real page content.
        pages = research.get("pages", []) or []
        page_text = "\n\n".join(
            f"### Page: {p.get('url','')}\n{(p.get('content') or '')[:2500]}"
            for p in pages if p.get("content")
        ) or "(no pages scraped)"
        prompt = (
            f"Company: {company_name}\n\nResearch:\n{research_text}\n\n"
            f"Scraped pages (real content from Bright Data):\n{page_text}\n\n"
            f"Web search evidence:\n{ev_text}\n\n"
            "Extract distinct GTM buying signals (hiring, funding, product launch, pricing change, "
            "new executive, expansion, competitor, partnership, tech-stack, event) plus any "
            "finance (headcount/layoff/investor) or security/compliance (breach/compliance/trust) "
            "signals. For each: a short title, a 1-2 sentence summary of why it matters, the source "
            "url, confidence (0-100), impact_score (0-100), and a concrete recommended sales action. "
            "Only include well-supported signals. No duplicates."
        )
        result = await llm.structured(
            prompt, schema=_SIGNAL_SCHEMA, tier="balanced",
            tool_description="Emit normalized GTM signals.",
            system="You are an expert SDR signal analyst. Be precise and grounded in the evidence.",
        )
        return (result or {}).get("signals", []) if result else []

    def _extract_heuristic(
        self, company_name: str, research: dict[str, Any], evidence: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        out: list[dict[str, Any]] = []
        roles = research.get("roles") or []
        if roles:
            out.append({
                "type": "hiring", "title": f"Hiring {len(roles)} go-to-market roles",
                "summary": f"{company_name} has open roles: {', '.join(roles[:5])} — likely "
                           "expanding its GTM team.",
                "source_url": f"https://{research.get('domain','')}/careers",
                "confidence": 88, "impact_score": 85,
                "recommended_action": "Contact Head of Sales about scaling the team.",
            })
        if research.get("pricing"):
            out.append({
                "type": "pricing", "title": "Pricing / packaging change",
                "summary": research["pricing"],
                "source_url": f"https://{research.get('domain','')}/pricing",
                "confidence": 80, "impact_score": 70,
                "recommended_action": "Reference the new packaging in the opener.",
            })
        for n in research.get("news", []):
            title = n.get("title", "")
            t = "product" if re.search(r"launch|product|enterprise", title, re.I) else (
                "funding" if re.search(r"funding|raise|round|series", title, re.I) else "news")
            out.append({
                "type": t, "title": title[:120], "summary": title,
                "source_url": n.get("url", ""), "confidence": 82, "impact_score": 76,
                "recommended_action": "Send a signal-based email referencing this news.",
            })
        for e in evidence:
            kind = e.get("kind")
            if kind in {"funding", "hiring", "product", "pricing"} and not any(
                s["title"] == e.get("title") for s in out
            ):
                out.append({
                    "type": kind, "title": e.get("title", "")[:120],
                    "summary": e.get("snippet", e.get("title", "")),
                    "source_url": e.get("url", ""), "confidence": 75, "impact_score": 68,
                    "recommended_action": "Review and action via outreach.",
                })
        return out

    def _finalize(self, signals: list[dict[str, Any]]) -> list[dict[str, Any]]:
        seen: set[str] = set()
        final: list[dict[str, Any]] = []
        for s in signals:
            stype = s.get("type", "news")
            if stype not in VALID_TYPES:
                stype = "news"
            title = (s.get("title") or "").strip()
            if not title:
                continue
            h = dedupe_hash(stype, title)
            if h in seen:
                continue
            seen.add(h)
            final.append({
                "type": stype,
                "title": title[:200],
                "summary": (s.get("summary") or title)[:600],
                "source_url": s.get("source_url") or s.get("url"),
                "confidence": float(max(0, min(100, s.get("confidence", 70)))),
                "impact_score": float(max(0, min(100, s.get("impact_score", 65)))),
                "recommended_action": s.get("recommended_action") or "Review and action.",
                "dedupe_hash": h,
            })
        return final


signal_extraction_service = SignalExtractionService()
