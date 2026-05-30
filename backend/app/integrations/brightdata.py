"""Bright Data — the core web-data engine for RevenueOS.

REAL-FIRST. Uses Bright Data's `/request` endpoint:
  * SERP API (search) with `brd_json=1` for structured organic results
  * Web Unlocker (page fetch) for company pages, careers, pricing, news

If the token is missing and REVENUEOS_ALLOW_MOCK is not set, every method raises
IntegrationNotConfigured — demo data is never served by default.

Docs: https://docs.brightdata.com/  (Web Unlocker, SERP API, Web MCP)
"""
from __future__ import annotations

import json
import re
from typing import Any
from urllib.parse import quote_plus

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.core.logging import get_logger
from app.integrations import brightdata_mock as mock

log = get_logger("brightdata")

_API = "https://api.brightdata.com/request"


class BrightDataClient:
    def __init__(self) -> None:
        self._enabled = settings.brightdata_enabled
        self._token = settings.brightdata_api_token
        if self._enabled:
            log.info("Bright Data enabled (live web data).")
        elif settings.mock_allowed:
            log.warning("Bright Data NOT configured — REVENUEOS_ALLOW_MOCK on, serving mock data.")

    @property
    def enabled(self) -> bool:
        return self._enabled

    def _guard(self) -> None:
        settings.require("Bright Data", self._enabled)

    # --- low-level: Bright Data /request --------------------------------------
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8), reraise=True)
    async def _request(self, url: str, *, zone: str, response_format: str = "raw") -> str:
        payload = {"zone": zone, "url": url, "format": response_format}
        headers = {"Authorization": f"Bearer {self._token}", "Content-Type": "application/json"}
        async with httpx.AsyncClient(timeout=90) as c:
            r = await c.post(_API, json=payload, headers=headers)
            r.raise_for_status()
            return r.text

    @property
    def serp_enabled(self) -> bool:
        return settings.brightdata_serp_enabled

    # --- SERP search (structured) ---------------------------------------------
    async def search_web(self, query: str, *, num: int = 10) -> list[dict[str, Any]]:
        self._guard()
        if not self._enabled:
            return mock.search_web(query, num)
        if not self.serp_enabled:
            # No SERP zone configured — search unavailable; callers degrade.
            return []
        url = f"https://www.google.com/search?q={quote_plus(query)}&num={num}&brd_json=1"
        raw = await self._request(url, zone=settings.brightdata_serp_zone)
        return self._parse_serp(raw, num)

    def _parse_serp(self, raw: str, num: int) -> list[dict[str, Any]]:
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            return []
        organic = data.get("organic") or data.get("organic_results") or []
        out = []
        for item in organic[:num]:
            out.append({
                "title": item.get("title") or item.get("name") or "",
                "url": item.get("link") or item.get("url") or "",
                "snippet": item.get("description") or item.get("snippet") or "",
            })
        return out

    # --- page fetch (Web Unlocker) --------------------------------------------
    async def scrape_url(self, url: str) -> dict[str, Any]:
        self._guard()
        if not self._enabled:
            return mock.scrape_url(url)
        html = await self._request(url, zone=settings.brightdata_web_unlocker_zone)
        return {
            "url": url,
            "title": mock.extract_title(html),
            "content": mock.html_to_text(html)[:12000],
            "raw": {},
        }

    # --- high-level research jobs ---------------------------------------------
    async def research_company(self, company_name: str) -> dict[str, Any]:
        """Aggregate SERP + key pages into a raw dossier (Claude synthesizes later)."""
        self._guard()
        if not self._enabled:
            return mock.research_company(company_name)

        results = await self.search_web(f"{company_name} company official site", num=8)
        homepage = self._best_homepage(company_name, results)
        if not homepage:
            # No SERP (or no hit) — derive the likely homepage and scrape directly.
            slug = re.sub(r"[^a-z0-9]", "", company_name.lower())
            homepage = f"https://{slug}.com"
        domain = self._domain_of(homepage)

        pages: list[dict[str, Any]] = []
        for path in ("", "/pricing", "/careers", "/about"):
            if not homepage:
                break
            try:
                pages.append(await self.scrape_url(homepage.rstrip("/") + path))
            except Exception as exc:  # individual page failures shouldn't abort research
                log.warning("scrape failed for %s%s: %s", homepage, path, exc)

        news = await self.search_web(f"{company_name} news funding launch announcement", num=6)

        return {
            "company": company_name,
            "domain": domain,
            "homepage": homepage,
            "search_results": results,
            "pages": pages,
            "news": [{"title": n["title"], "url": n["url"]} for n in news],
        }

    async def extract_careers_page(self, company_url: str) -> dict[str, Any]:
        self._guard()
        if not self._enabled:
            return mock.careers(company_url)
        page = await self.scrape_url(company_url.rstrip("/") + "/careers")
        return {"url": page["url"], "content": page["content"]}

    async def monitor_pricing_page(self, company_url: str) -> dict[str, Any]:
        self._guard()
        if not self._enabled:
            return mock.pricing(company_url)
        return await self.scrape_url(company_url.rstrip("/") + "/pricing")

    async def find_recent_news(self, company_name: str) -> list[dict[str, Any]]:
        self._guard()
        if not self._enabled:
            return mock.news(company_name)
        return await self.search_web(f"{company_name} news funding launch announcement", num=8)

    async def find_decision_makers(self, company_name: str) -> list[dict[str, Any]]:
        self._guard()
        if not self._enabled:
            return mock.decision_makers(company_name)
        results = await self.search_web(
            f'{company_name} ("VP Sales" OR "Head of Sales" OR CRO OR "RevOps") site:linkedin.com/in',
            num=10,
        )
        people: list[dict[str, Any]] = []
        for r in results:
            name, title = self._parse_linkedin_title(r.get("title", ""))
            if name:
                people.append({"name": name, "title": title, "linkedin_url": r.get("url"),
                               "company": company_name})
        return people

    async def extract_buying_signals(self, company_name: str) -> list[dict[str, Any]]:
        self._guard()
        if not self._enabled:
            return mock.buying_signal_evidence(company_name)
        out: list[dict[str, Any]] = []
        queries = {
            "hiring": f"{company_name} hiring sales OR account executive OR SDR jobs",
            "funding": f"{company_name} funding round raised investment",
            "product": f"{company_name} launches new product OR feature OR enterprise",
            "pricing": f"{company_name} pricing change new plan tier",
            "partnership": f"{company_name} partnership integration announcement",
        }
        for kind, q in queries.items():
            for r in await self.search_web(q, num=3):
                out.append({"kind": kind, "title": r["title"], "url": r["url"], "snippet": r["snippet"]})
        return out

    async def find_similar_companies(self, description: str, *, limit: int = 8) -> list[dict[str, Any]]:
        self._guard()
        if not self._enabled:
            return mock.similar_companies(description, limit)
        results = await self.search_web(f"companies like {description}", num=limit)
        return [{"name": r["title"].split("—")[0].split("|")[0].strip(),
                 "domain": self._domain_of(r["url"]), "summary": r["snippet"]} for r in results]

    # --- helpers ---------------------------------------------------------------
    @staticmethod
    def _domain_of(url: str | None) -> str | None:
        if not url:
            return None
        return re.sub(r"^https?://(www\.)?", "", url).split("/")[0]

    def _best_homepage(self, company: str, results: list[dict]) -> str | None:
        slug = re.sub(r"[^a-z0-9]", "", company.lower())
        for r in results:
            dom = self._domain_of(r.get("url")) or ""
            if slug and slug in dom.replace(".", ""):
                return f"https://{dom}"
        return f"https://{self._domain_of(results[0]['url'])}" if results else None

    @staticmethod
    def _parse_linkedin_title(title: str) -> tuple[str | None, str]:
        # "Jane Doe - VP of Sales - Acme | LinkedIn"
        parts = [p.strip() for p in re.split(r"[-|·–]", title) if p.strip()]
        if not parts:
            return None, ""
        name = parts[0]
        role = parts[1] if len(parts) > 1 and "linkedin" not in parts[1].lower() else ""
        return name, role


brightdata = BrightDataClient()
