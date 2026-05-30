"""AccountResearchService — the data backbone orchestrator.

Flow (mirrors the brief):
  company name
    -> Bright Data: research_company + buying-signal evidence + decision makers
    -> SignalExtractionService: normalize signals
    -> ScoringService: fit/intent/timing/risk/overall
    -> persist account, contacts, sources, signals, score history
    -> MemoryService (Cognee): store company/contact/signal memory + edges
    -> return assembled profile
"""
from __future__ import annotations

import re
from typing import Any

from app.core.config import settings
from app.core.db import get_db, new_id, now_iso
from app.core.llm import llm
from app.core.logging import get_logger
from app.core.tasks import spawn
from app.integrations.brightdata import brightdata
from app.services.memory import memory_service
from app.services.scoring import scoring_service
from app.services.signal_extraction import signal_extraction_service

log = get_logger("research")


def _slug_domain(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", name.lower()) + ".com"


class AccountResearchService:
    async def research(self, team_id: str, company_name: str, owner_id: str | None = None) -> dict[str, Any]:
        db = get_db()
        log.info("Researching %s for team %s", company_name, team_id)

        # 1. Bright Data gathering (parallelizable; kept simple/sequential for clarity)
        research = await brightdata.research_company(company_name)
        evidence = await brightdata.extract_buying_signals(company_name)
        people = await brightdata.find_decision_makers(company_name)

        # 2. Normalize signals
        raw_signals = await signal_extraction_service.extract(company_name, research, evidence)

        # 3. Build/lookup account record
        domain = research.get("domain") or _slug_domain(company_name)
        team = await self._team(team_id)
        icp = team.get("icp", {}) if team else {}

        existing = (
            await db.table("accounts").select("*")
            .eq("team_id", team_id).eq("domain", domain).limit(1).execute()
        ).data
        account = existing[0] if existing else None

        # Infer summary + industry from scraped content when research lacks them.
        profile = await self._profile(company_name, research)
        account_fields = {
            "team_id": team_id,
            "owner_id": owner_id,
            "name": company_name,
            "domain": domain,
            "website": research.get("homepage") or f"https://{domain}",
            "logo_url": f"https://logo.clearbit.com/{domain}",
            "industry": research.get("industry") or profile.get("industry"),
            "description": research.get("summary") or profile.get("summary"),
            "employee_estimate": research.get("employees"),
            "research": {
                "products": research.get("products", []),
                "pricing": research.get("pricing"),
                "news": research.get("news", []),
                "roles": research.get("roles", []),
                "search_results": research.get("search_results", []),
            },
            "last_researched_at": now_iso(),
        }

        if account:
            account_id = account["id"]
            await db.table("accounts").update(account_fields).eq("id", account_id).execute()
            account.update(account_fields)
        else:
            account_id = new_id()
            account = {"id": account_id, "stage": "researching", "engagement_score": 0, **account_fields}
            await db.table("accounts").insert(account).execute()

        # 4. Persist sources (provenance)
        await self._persist_sources(team_id, account_id, research, evidence)

        # 5. Persist signals (dedupe against existing)
        stored_signals = await self._persist_signals(team_id, account_id, raw_signals)

        # 6. Score
        all_signals = (
            await db.table("signals").select("*").eq("account_id", account_id).execute()
        ).data or stored_signals
        scores = scoring_service.compute(account, all_signals, icp)
        why_now = scores["rationale"].get("why_now") or (
            all_signals[0]["summary"] if all_signals else "Recently researched."
        )
        recommended = (all_signals[0].get("recommended_action") if all_signals
                       else "Generate a personalized sequence.")
        # Only the numeric score columns belong on `accounts` (rationale lives in
        # account_scores). Strip the nested rationale before updating the row.
        score_cols = {k: v for k, v in scores.items() if k != "rationale"}
        await db.table("accounts").update({
            **score_cols, "why_now": why_now, "recommended_action": recommended,
        }).eq("id", account_id).execute()
        account.update(score_cols)
        account["why_now"] = why_now
        account["recommended_action"] = recommended

        await db.table("account_scores").insert({
            "team_id": team_id, "account_id": account_id,
            "overall_score": scores["overall_score"], "fit_score": scores["fit_score"],
            "intent_score": scores["intent_score"], "timing_score": scores["timing_score"],
            "engagement_score": scores["engagement_score"], "risk_penalty": scores["risk_penalty"],
            "rationale": scores["rationale"], "scored_at": now_iso(),
        }).execute()

        # 7. Persist contacts (decision makers)
        contacts = await self._persist_contacts(team_id, account_id, company_name, people)

        # 8. Risk flags from risk-type signals
        await self._persist_risk_flags(team_id, account_id, stored_signals)

        # 9. Memory (Cognee) — batched into one graph build, run in the background
        # so the slow cognify pipeline doesn't block the research response.
        spawn(memory_service.ingest_research(account, all_signals, contacts),
              name=f"cognee:{company_name}")

        return {
            "account": account,
            "signals": all_signals,
            "contacts": contacts,
            "scores": scores,
        }

    # ---- helpers --------------------------------------------------------------
    async def _team(self, team_id: str) -> dict | None:
        db = get_db()
        res = (await db.table("teams").select("*").eq("id", team_id).limit(1).execute()).data
        return res[0] if res else None

    async def _profile(self, name: str, research: dict) -> dict[str, str]:
        """Infer a 1-2 sentence summary + a concise industry label from scraped pages."""
        if not llm.enabled:
            return {"summary": f"{name} operates in {research.get('industry') or 'its market'}.",
                    "industry": research.get("industry") or ""}
        pages = research.get("pages", []) or []
        page_text = "\n".join((p.get("content") or "")[:1500] for p in pages)[:5000]
        ctx = page_text or f"Products: {research.get('products')}. News: {research.get('news')}"
        out = await llm.structured(
            f"From this scraped web content about {name}, write a crisp 1-2 sentence company "
            f"summary and a short industry label (e.g. 'Developer Tools', 'Fintech', 'AI "
            f"Infrastructure').\n\n{ctx}",
            schema={"type": "object", "properties": {
                "summary": {"type": "string"}, "industry": {"type": "string"}},
                "required": ["summary", "industry"]},
            tier="fast",
        )
        return out or {"summary": f"{name}.", "industry": research.get("industry") or ""}

    async def _persist_sources(self, team_id, account_id, research, evidence) -> None:
        db = get_db()
        rows = []
        for r in research.get("search_results", [])[:6]:
            rows.append({"team_id": team_id, "account_id": account_id, "kind": "serp",
                         "url": r.get("url"), "title": r.get("title"), "content": r.get("snippet"),
                         "collector": "brightdata.search", "fetched_at": now_iso()})
        for e in evidence[:8]:
            rows.append({"team_id": team_id, "account_id": account_id,
                         "kind": e.get("kind", "other") if e.get("kind") in
                         {"news", "pricing"} else "other",
                         "url": e.get("url"), "title": e.get("title"), "content": e.get("snippet"),
                         "collector": "brightdata.signals", "fetched_at": now_iso()})
        for row in rows:
            if row.get("url"):
                await db.table("sources").insert(row).execute()

    async def _persist_signals(self, team_id, account_id, raw_signals) -> list[dict]:
        db = get_db()
        existing = {
            s.get("dedupe_hash")
            for s in (await db.table("signals").select("*").eq("account_id", account_id).execute()).data or []
        }
        stored = []
        for s in raw_signals:
            if s["dedupe_hash"] in existing:
                continue
            row = {"team_id": team_id, "account_id": account_id, "status": "new",
                   "detected_at": now_iso(), **s}
            inserted = (await db.table("signals").insert(row).execute()).data
            stored.append(inserted[0] if isinstance(inserted, list) else inserted or row)
            existing.add(s["dedupe_hash"])
        return stored

    async def _persist_contacts(self, team_id, account_id, company_name, people) -> list[dict]:
        db = get_db()
        existing = (await db.table("contacts").select("*").eq("account_id", account_id).execute()).data or []
        existing_names = {c.get("full_name") for c in existing}
        out = list(existing)
        for p in people:
            if p.get("name") in existing_names:
                continue
            title = p.get("title", "")
            row = {
                "team_id": team_id, "account_id": account_id, "full_name": p.get("name"),
                "title": title, "seniority": self._seniority(title),
                "department": "Sales" if re.search(r"sales|revops|cro", title, re.I) else None,
                "linkedin_url": p.get("linkedin_url"),
                "is_decision_maker": bool(re.search(r"vp|head|chief|cro|director|founder", title, re.I)),
                "suggested_opener": None, "confidence": 80,
            }
            inserted = (await db.table("contacts").insert(row).execute()).data
            out.append(inserted[0] if isinstance(inserted, list) else inserted or row)
            existing_names.add(p.get("name"))
        return out

    async def _persist_risk_flags(self, team_id, account_id, signals) -> None:
        db = get_db()
        for s in signals:
            if s.get("type") in {"risk", "breach", "compliance", "complaint", "layoff"}:
                await db.table("risk_flags").insert({
                    "team_id": team_id, "account_id": account_id, "signal_id": s.get("id"),
                    "category": s["type"], "severity": "high" if s["type"] == "breach" else "medium",
                    "title": s["title"], "detail": s["summary"], "source_url": s.get("source_url"),
                    "detected_at": now_iso(),
                }).execute()

    @staticmethod
    def _seniority(title: str) -> str:
        t = title.lower()
        if re.search(r"chief|cro|ceo|cfo|cto|c-level", t):
            return "c_level"
        if "vp" in t or "vice president" in t:
            return "vp"
        if "head" in t or "director" in t:
            return "director"
        if "manager" in t or "lead" in t:
            return "manager"
        return "ic"


account_research_service = AccountResearchService()
