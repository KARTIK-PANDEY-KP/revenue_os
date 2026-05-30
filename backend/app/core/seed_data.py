"""In-memory demo dataset, mirroring supabase/seed/demo_seed.sql.

Used by MemoryRepo so the product is fully alive without any database. Kept in
sync with the SQL seed (same ids) so behavior is identical across backends.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

TEAM = "00000000-0000-0000-0000-0000000000aa"


def _ago(**kw) -> str:
    return (datetime.now(timezone.utc) - timedelta(**kw)).isoformat()


def _ahead(**kw) -> str:
    return (datetime.now(timezone.utc) + timedelta(**kw)).isoformat()


def build_seed() -> dict[str, list[dict]]:
    teams = [
        {
            "id": TEAM,
            "name": "RevenueOS Demo",
            "slug": "demo",
            "icp": {
                "industries": ["AI Infrastructure", "Developer Tools", "Data", "Fintech"],
                "employee_range": {"min": 50, "max": 5000},
                "personas": ["VP Sales", "Head of Sales", "RevOps", "CRO"],
                "pains": ["scaling outbound", "prioritizing accounts", "rep ramp time"],
                "keywords": ["enterprise", "hiring", "funding", "launch"],
            },
            "settings": {
                "tone": "consultative",
                "signature": "— Sent via RevenueOS",
                "default_channels": ["email", "call", "linkedin"],
            },
            "created_at": _ago(days=30),
            "updated_at": _ago(days=1),
        }
    ]

    accounts = [
        _acct("00000000-0000-0000-0000-0000000c0001", "Cursor", "cursor.com", "Developer Tools",
              "AI-native code editor building the future of programming with autonomous agents.",
              320, "qualified", 94, 92, 95, 96, 70, 8,
              "Hiring 12 enterprise sales reps in 30 days — building a GTM motion now.",
              "Call VP Sales about scaling outbound", _ago(hours=2)),
        _acct("00000000-0000-0000-0000-0000000c0002", "Anthropic", "anthropic.com", "AI Infrastructure",
              "AI safety company building reliable, interpretable, steerable AI systems.",
              1200, "engaged", 88, 90, 86, 89, 82, 4,
              "New enterprise product launch — expansion of go-to-market.",
              "Send launch-based email to RevOps", _ago(hours=5)),
        _acct("00000000-0000-0000-0000-0000000c0003", "Databricks", "databricks.com", "Data",
              "Data + AI lakehouse platform for analytics and ML at enterprise scale.",
              7000, "qualified", 91, 93, 90, 88, 65, 5,
              "New AI product launch + aggressive enterprise hiring.",
              "Call economic buyer", _ago(days=1)),
        _acct("00000000-0000-0000-0000-0000000c0004", "Rippling", "rippling.com", "Fintech",
              "Workforce management platform unifying HR, IT, and finance.",
              3500, "researching", 87, 85, 84, 90, 55, 10,
              "Fresh funding round + compliance hiring spike.",
              "Send funding-based email", _ago(hours=8)),
        _acct("00000000-0000-0000-0000-0000000c0005", "Vercel", "vercel.com", "Developer Tools",
              "Frontend cloud for building and deploying web applications.",
              600, "new", 79, 82, 74, 78, 40, 6,
              "Pricing page changed — new enterprise tier introduced.",
              "Generate sequence", _ago(days=3)),
    ]

    contacts = [
        _contact("00000000-0000-0000-0000-0000000d0001", "00000000-0000-0000-0000-0000000c0001",
                 "Jordan Mehta", "VP of Sales", "vp", "Sales", "jordan@cursor.com",
                 "Saw Cursor is scaling enterprise sales fast — how are you prioritizing which "
                 "accounts get rep time?", 92),
        _contact("00000000-0000-0000-0000-0000000d0002", "00000000-0000-0000-0000-0000000c0001",
                 "Priya Nair", "Head of RevOps", "director", "RevOps", "priya@cursor.com",
                 "With 12 new reps ramping, the prioritization bottleneck usually hits RevOps first.", 86),
        _contact("00000000-0000-0000-0000-0000000d0003", "00000000-0000-0000-0000-0000000c0002",
                 "Sam Coleman", "RevOps Lead", "manager", "RevOps", "sam@anthropic.com",
                 "Congrats on the enterprise launch — curious how you're routing inbound to the right reps.", 84),
        _contact("00000000-0000-0000-0000-0000000d0004", "00000000-0000-0000-0000-0000000c0003",
                 "Alex Romero", "CRO", "c_level", "Sales", "alex@databricks.com",
                 "New AI launch + hiring usually means rep capacity is the constraint — worth a chat?", 88),
    ]

    signals = [
        _signal("00000000-0000-0000-0000-0000000e0001", "00000000-0000-0000-0000-0000000c0001",
                "hiring", "Hiring 12 enterprise sales roles",
                "Cursor added 12 enterprise sales roles in the last 30 days across AE, SE, and CS.",
                "https://cursor.com/careers", 95, 92, "Contact Head of Sales", _ago(hours=2)),
        _signal("00000000-0000-0000-0000-0000000e0002", "00000000-0000-0000-0000-0000000c0001",
                "product", "Launched enterprise plan",
                "Cursor introduced an enterprise tier with SSO, audit logs, and admin controls.",
                "https://cursor.com/pricing", 90, 80, "Reference launch in opener", _ago(days=1)),
        _signal("00000000-0000-0000-0000-0000000e0003", "00000000-0000-0000-0000-0000000c0002",
                "product", "New enterprise product launch",
                "Anthropic launched a new enterprise offering expanding its GTM surface area.",
                "https://anthropic.com/news", 88, 85, "Send launch-based email", _ago(hours=5)),
        _signal("00000000-0000-0000-0000-0000000e0004", "00000000-0000-0000-0000-0000000c0004",
                "funding", "Raised new funding round",
                "Rippling closed a new growth round, signaling expansion and budget availability.",
                "https://techcrunch.com", 86, 88, "Send funding-based email", _ago(hours=8)),
        _signal("00000000-0000-0000-0000-0000000e0005", "00000000-0000-0000-0000-0000000c0004",
                "compliance", "Compliance hiring spike",
                "Rippling posted multiple compliance + security roles — a vendor evaluation signal.",
                "https://rippling.com/careers", 78, 70, "Lead with security/compliance angle", _ago(hours=10)),
        _signal("00000000-0000-0000-0000-0000000e0006", "00000000-0000-0000-0000-0000000c0005",
                "pricing", "Pricing page change detected",
                "Vercel added a new enterprise pricing tier and removed the legacy team plan.",
                "https://vercel.com/pricing", 82, 68, "Generate sequence referencing new tier", _ago(days=3)),
    ]

    risk_flags = [
        {
            "id": "00000000-0000-0000-0000-0000000f0001", "team_id": TEAM,
            "account_id": "00000000-0000-0000-0000-0000000c0004", "category": "compliance",
            "severity": "medium", "title": "Active compliance buildout",
            "detail": "Rippling is expanding compliance staff — frame messaging around security "
                      "posture, not speed.",
            "source_url": "https://rippling.com/careers", "resolved": False,
            "detected_at": _ago(hours=10), "created_at": _ago(hours=10),
        }
    ]

    sequences = [
        {
            "id": "00000000-0000-0000-0000-000000a00001", "team_id": TEAM,
            "account_id": "00000000-0000-0000-0000-0000000c0001",
            "contact_id": "00000000-0000-0000-0000-0000000d0001",
            "name": "Cursor — Enterprise Scaling", "persona": "VP of Sales",
            "objective": "Book a 20-min intro on account prioritization",
            "tone": "consultative", "channels": ["email", "call", "linkedin"],
            "approval_mode": "manual", "status": "draft",
            "created_at": _ago(hours=2), "updated_at": _ago(hours=2),
        }
    ]

    sequence_steps = [
        _step("00000000-0000-0000-0000-000000a00001", 1, "email", 0,
              "Mention the 12 enterprise sales hires; tie to account prioritization pain.",
              {"subject": "Scaling enterprise motion at Cursor",
               "body": "Saw Cursor has been hiring aggressively across enterprise sales. Usually "
                       "when teams hit this stage, the bottleneck becomes which accounts deserve "
                       "rep time first..."}),
        _step("00000000-0000-0000-0000-000000a00001", 2, "call", 2,
              "Open with the scaling-sales-team angle; ROI on rep time.", {}),
        _step("00000000-0000-0000-0000-000000a00001", 3, "linkedin", 4,
              "Short note referencing company growth + enterprise launch.", {}),
        _step("00000000-0000-0000-0000-000000a00001", 4, "email", 7,
              "Share a relevant case study; soft CTA.", {}),
    ]

    tasks = [
        {
            "id": "00000000-0000-0000-0000-00000000b001", "team_id": TEAM,
            "account_id": "00000000-0000-0000-0000-0000000c0001",
            "contact_id": "00000000-0000-0000-0000-0000000d0001",
            "signal_id": "00000000-0000-0000-0000-0000000e0001",
            "kind": "call", "status": "open", "priority": 1,
            "title": "Call Jordan Mehta (VP Sales) at Cursor",
            "detail": "High-intent: 12 enterprise hires + enterprise launch. Use scaling angle.",
            "due_at": _ahead(days=1), "created_at": _ago(hours=2), "updated_at": _ago(hours=2),
        },
        {
            "id": "00000000-0000-0000-0000-00000000b002", "team_id": TEAM,
            "account_id": "00000000-0000-0000-0000-0000000c0002",
            "contact_id": "00000000-0000-0000-0000-0000000d0003",
            "signal_id": "00000000-0000-0000-0000-0000000e0003",
            "kind": "email", "status": "open", "priority": 2,
            "title": "Send launch-based email to Anthropic RevOps",
            "detail": "Reference new enterprise launch; offer prioritization demo.",
            "due_at": _ahead(days=2), "created_at": _ago(hours=5), "updated_at": _ago(hours=5),
        },
    ]

    account_scores = [
        {
            "id": f"score-{a['id'][-4:]}", "team_id": TEAM, "account_id": a["id"],
            "overall_score": a["overall_score"], "fit_score": a["fit_score"],
            "intent_score": a["intent_score"], "timing_score": a["timing_score"],
            "engagement_score": a["engagement_score"], "risk_penalty": a["risk_penalty"],
            "rationale": {"seeded": True}, "scored_at": _ago(hours=2),
        }
        for a in accounts
    ]

    return {
        "teams": teams,
        "accounts": accounts,
        "contacts": contacts,
        "signals": signals,
        "risk_flags": risk_flags,
        "sequences": sequences,
        "sequence_steps": sequence_steps,
        "tasks": tasks,
        "account_scores": account_scores,
        "sources": [],
        "outreach_messages": [],
        "calls": [],
        "call_transcripts": [],
        "call_scorecards": [],
        "workflows": [],
        "playbooks": [],
        "competitors": [],
        "profiles": [],
        "team_members": [],
    }


def _acct(id_, name, domain, industry, desc, emp, stage, overall, fit, intent, timing,
          eng, risk, why, action, researched):
    return {
        "id": id_, "team_id": TEAM, "owner_id": None, "name": name, "domain": domain,
        "website": f"https://{domain}", "logo_url": f"https://logo.clearbit.com/{domain}",
        "industry": industry, "description": desc, "employee_estimate": emp,
        "hq_location": "San Francisco, CA", "founded_year": None, "stage": stage,
        "overall_score": overall, "fit_score": fit, "intent_score": intent,
        "timing_score": timing, "engagement_score": eng, "risk_penalty": risk,
        "why_now": why, "recommended_action": action, "research": {},
        "memory_node_id": None, "last_researched_at": researched,
        "created_at": _ago(days=5), "updated_at": researched,
    }


def _contact(id_, acct, name, title, sen, dept, email, opener, conf):
    return {
        "id": id_, "team_id": TEAM, "account_id": acct, "full_name": name, "title": title,
        "seniority": sen, "department": dept, "email": email, "phone": None,
        "linkedin_url": f"https://linkedin.com/in/{name.lower().replace(' ', '')}",
        "location": "San Francisco, CA", "is_decision_maker": True,
        "suggested_opener": opener, "confidence": conf, "enrichment": {},
        "memory_node_id": None, "created_at": _ago(days=4), "updated_at": _ago(days=1),
    }


def _signal(id_, acct, type_, title, summary, url, conf, impact, action, detected):
    return {
        "id": id_, "team_id": TEAM, "account_id": acct, "source_id": None, "type": type_,
        "title": title, "summary": summary, "source_url": url, "confidence": conf,
        "impact_score": impact, "recommended_action": action, "status": "new",
        "dedupe_hash": f"{type_}:{title.lower().replace(' ', '-')}",
        "detected_at": detected, "created_at": detected,
    }


def _step(seq, order, channel, day, instruction, content):
    return {
        "id": f"step-{seq[-4:]}-{order}", "team_id": TEAM, "sequence_id": seq,
        "step_order": order, "channel": channel, "day_offset": day,
        "instruction": instruction, "content": content, "status": "pending",
        "scheduled_at": None, "executed_at": None,
        "created_at": _ago(hours=2), "updated_at": _ago(hours=2),
    }
