"""Realistic mock fixtures for Bright Data.

These make the research/signal/prospecting pipelines fully functional offline.
Known demo companies get curated data; unknown companies get a plausible,
deterministically-generated dossier so any search term still "works".
"""
from __future__ import annotations

import hashlib
import re
from typing import Any

# Curated dossiers for the demo set ------------------------------------------
_COMPANIES: dict[str, dict[str, Any]] = {
    "cursor": {
        "domain": "cursor.com",
        "industry": "Developer Tools",
        "employees": 320,
        "summary": "AI-native code editor building autonomous coding agents for engineering teams.",
        "products": ["Cursor IDE", "Cursor Agents", "Cursor Enterprise"],
        "roles": [
            "Enterprise Account Executive", "Sales Engineer", "Enterprise AE (East)",
            "Customer Success Manager", "Head of Sales Development", "Solutions Architect",
        ],
        "news": [
            ("Cursor launches Enterprise plan with SSO and audit logs", "https://cursor.com/blog/enterprise"),
            ("Cursor crosses major ARR milestone amid AI coding boom", "https://techcrunch.com/cursor"),
            ("Cursor hiring spree targets enterprise go-to-market", "https://news.example.com/cursor-hiring"),
        ],
        "pricing": "Added an Enterprise tier (SSO, audit logs, admin controls) above Pro.",
        "people": [
            ("Jordan Mehta", "VP of Sales"), ("Priya Nair", "Head of RevOps"),
            ("Daniel Cho", "Enterprise AE"),
        ],
    },
    "anthropic": {
        "domain": "anthropic.com",
        "industry": "AI Infrastructure",
        "employees": 1200,
        "summary": "AI safety company building reliable, interpretable, steerable AI systems (Claude).",
        "products": ["Claude", "Claude for Enterprise", "Claude API"],
        "roles": ["Enterprise Sales", "RevOps Lead", "Partnerships Manager"],
        "news": [
            ("Anthropic launches new enterprise offering", "https://anthropic.com/news/enterprise"),
            ("Anthropic expands go-to-market team", "https://news.example.com/anthropic-gtm"),
        ],
        "pricing": "Introduced enterprise seat-based pricing with admin + compliance controls.",
        "people": [("Sam Coleman", "RevOps Lead"), ("Lena Park", "Enterprise Sales")],
    },
    "databricks": {
        "domain": "databricks.com",
        "industry": "Data",
        "employees": 7000,
        "summary": "Data + AI lakehouse platform for analytics and ML at enterprise scale.",
        "products": ["Lakehouse", "Mosaic AI", "Unity Catalog"],
        "roles": ["Enterprise AE", "AI Specialist", "Field CTO", "SDR Manager"],
        "news": [("Databricks unveils new AI product suite", "https://databricks.com/blog/ai")],
        "pricing": "Consumption-based pricing across compute tiers; new AI add-ons.",
        "people": [("Alex Romero", "CRO"), ("Maria Singh", "VP Sales")],
    },
    "rippling": {
        "domain": "rippling.com",
        "industry": "Fintech",
        "employees": 3500,
        "summary": "Workforce management platform unifying HR, IT, and finance.",
        "products": ["HR Cloud", "IT Cloud", "Finance Cloud"],
        "roles": ["Compliance Manager", "Security Engineer", "Enterprise AE", "GRC Analyst"],
        "news": [("Rippling closes new growth funding round", "https://techcrunch.com/rippling")],
        "pricing": "Per-employee-per-month modular pricing.",
        "people": [("Chris Bell", "VP Sales"), ("Dana Liu", "Head of Compliance")],
    },
    "vercel": {
        "domain": "vercel.com",
        "industry": "Developer Tools",
        "employees": 600,
        "summary": "Frontend cloud for building and deploying web applications.",
        "products": ["Vercel", "Next.js", "v0"],
        "roles": ["Enterprise AE", "DevRel", "Solutions Engineer"],
        "news": [("Vercel updates pricing with new enterprise tier", "https://vercel.com/blog/pricing")],
        "pricing": "Added a new enterprise tier; retired the legacy team plan.",
        "people": [("Tom Frey", "VP Sales")],
    },
}


def _key(name: str) -> str:
    return re.sub(r"[^a-z0-9]", "", name.lower())


def _seed_int(text: str) -> int:
    return int(hashlib.sha256(text.encode()).hexdigest(), 16)


def _generic(name: str) -> dict[str, Any]:
    seed = _seed_int(name)
    industries = ["AI Infrastructure", "Developer Tools", "Data", "Fintech", "SaaS", "Security"]
    return {
        "domain": f"{_key(name)}.com",
        "industry": industries[seed % len(industries)],
        "employees": 50 + (seed % 4000),
        "summary": f"{name} is a fast-growing company in the {industries[seed % len(industries)]} "
                   f"space, expanding its team and product surface.",
        "products": [f"{name} Platform", f"{name} Enterprise"],
        "roles": ["Enterprise Account Executive", "Sales Engineer", "RevOps Lead"],
        "news": [
            (f"{name} announces new enterprise capabilities", f"https://news.example.com/{_key(name)}"),
            (f"{name} expands go-to-market team", f"https://news.example.com/{_key(name)}-gtm"),
        ],
        "pricing": f"{name} introduced a new enterprise pricing tier.",
        "people": [("Jamie Rivera", "VP of Sales"), ("Morgan Lee", "Head of RevOps")],
    }


def _dossier(name: str) -> dict[str, Any]:
    return _COMPANIES.get(_key(name), _generic(name))


# --- helpers used by the client ---------------------------------------------
def fetch_url(url: str) -> str:
    return f"<html><body><h1>{url}</h1><p>Mock page content for {url}.</p></body></html>"


def extract_title(html: str) -> str:
    m = re.search(r"<title>(.*?)</title>", html, re.I | re.S) or re.search(r"<h1>(.*?)</h1>", html, re.I | re.S)
    return (m.group(1).strip() if m else "Untitled")[:200]


def html_to_text(html: str) -> str:
    text = re.sub(r"<[^>]+>", " ", html)
    return re.sub(r"\s+", " ", text).strip()


def parse_serp(html: str) -> list[dict[str, Any]]:
    return []  # real SERP parsing left to Bright Data structured output; mock used otherwise


def parse_roles(content: str) -> list[str]:  # noqa: ARG001
    return ["Enterprise Account Executive", "Sales Engineer"]


def scrape_url(url: str) -> dict[str, Any]:
    return {"url": url, "title": f"Page: {url}", "content": fetch_url(url), "raw": {}}


def search_web(query: str, num: int = 10) -> list[dict[str, Any]]:
    # try to anchor on a known company mentioned in the query
    name = next((n for n in _COMPANIES if n in query.lower()), None)
    d = _dossier(name or query.split()[0])
    base = [{"title": t, "url": u, "snippet": t} for t, u in d["news"]]
    base.append({"title": f"{name or 'Company'} — Careers", "url": f"https://{d['domain']}/careers",
                 "snippet": "Open roles in sales and engineering."})
    base.append({"title": f"{name or 'Company'} — Pricing", "url": f"https://{d['domain']}/pricing",
                 "snippet": d["pricing"]})
    return base[:num]


def research_company(name: str) -> dict[str, Any]:
    d = _dossier(name)
    return {
        "company": name,
        "domain": d["domain"],
        "industry": d["industry"],
        "employees": d["employees"],
        "summary": d["summary"],
        "products": d["products"],
        "pricing": d["pricing"],
        "news": [{"title": t, "url": u} for t, u in d["news"]],
        "roles": d["roles"],
        "people": [{"name": n, "title": ti} for n, ti in d["people"]],
        "homepage": f"https://{d['domain']}",
        "search_results": search_web(name),
    }


def careers(company_url: str) -> dict[str, Any]:
    name = _name_from_url(company_url)
    return {"url": f"{company_url}/careers", "roles": _dossier(name)["roles"]}


def pricing(company_url: str) -> dict[str, Any]:
    name = _name_from_url(company_url)
    return {"url": f"{company_url}/pricing", "title": "Pricing", "content": _dossier(name)["pricing"], "raw": {}}


def news(name: str) -> list[dict[str, Any]]:
    return [{"title": t, "url": u, "snippet": t} for t, u in _dossier(name)["news"]]


def decision_makers(name: str) -> list[dict[str, Any]]:
    d = _dossier(name)
    return [
        {"name": n, "title": ti, "linkedin_url": f"https://linkedin.com/in/{_key(n)}",
         "company": name}
        for n, ti in d["people"]
    ]


def buying_signal_evidence(name: str) -> list[dict[str, Any]]:
    d = _dossier(name)
    ev: list[dict] = []
    ev.append({"title": f"{name} hiring {len(d['roles'])} sales roles", "url": f"https://{d['domain']}/careers",
               "snippet": ", ".join(d["roles"]), "kind": "hiring"})
    ev.append({"title": d["pricing"], "url": f"https://{d['domain']}/pricing", "snippet": d["pricing"],
               "kind": "pricing"})
    for t, u in d["news"]:
        ev.append({"title": t, "url": u, "snippet": t, "kind": "news"})
    return ev


def similar_companies(description: str, limit: int) -> list[dict[str, Any]]:
    pool = list(_COMPANIES.keys())
    return [
        {"name": n.capitalize(), "domain": _COMPANIES[n]["domain"],
         "industry": _COMPANIES[n]["industry"], "summary": _COMPANIES[n]["summary"]}
        for n in pool[:limit]
    ]


def results_to_people(results: list[dict], company: str) -> list[dict[str, Any]]:  # noqa: ARG001
    return decision_makers(company)


def results_to_companies(results: list[dict]) -> list[dict[str, Any]]:
    out = []
    for r in results:
        nm = r.get("title", "Company").split("—")[0].strip()
        out.append({"name": nm, "domain": _key(nm) + ".com", "summary": r.get("snippet", "")})
    return out


def _name_from_url(url: str) -> str:
    host = re.sub(r"^https?://(www\.)?", "", url).split("/")[0]
    return host.split(".")[0]
