"""DashboardService — the GTM command-center aggregate."""
from __future__ import annotations

from typing import Any

from app.core.db import get_db


class DashboardService:
    async def summary(self, team_id: str) -> dict[str, Any]:
        db = get_db()
        accounts = (await db.table("accounts").select("*").eq("team_id", team_id)
                    .order("overall_score", desc=True).execute()).data or []
        signals = (await db.table("signals").select("*").eq("team_id", team_id)
                   .order("detected_at", desc=True).execute()).data or []
        tasks = (await db.table("tasks").select("*").eq("team_id", team_id)
                 .eq("status", "open").order("priority").execute()).data or []
        sequences = (await db.table("sequences").select("*").eq("team_id", team_id).execute()).data or []
        calls = (await db.table("calls").select("*").eq("team_id", team_id).execute()).data or []
        risks = (await db.table("risk_flags").select("*").eq("team_id", team_id)
                 .eq("resolved", False).execute()).data or []
        drafts = (await db.table("outreach_messages").select("*").eq("team_id", team_id)
                  .eq("status", "draft").execute()).data or []

        hot = [a for a in accounts if (a.get("overall_score") or 0) >= 80]
        risk_account_ids = {r["account_id"] for r in risks}

        # enrich hot accounts with latest signal for the table
        sig_by_acct: dict[str, dict] = {}
        for s in signals:
            sig_by_acct.setdefault(s["account_id"], s)

        leaderboard = []
        for rank, a in enumerate(accounts[:12], 1):
            ls = sig_by_acct.get(a["id"])
            leaderboard.append({
                "rank": rank, "id": a["id"], "name": a["name"], "domain": a.get("domain"),
                "logo_url": a.get("logo_url"), "score": a.get("overall_score"),
                "fit": a.get("fit_score"), "intent": a.get("intent_score"),
                "timing": a.get("timing_score"), "stage": a.get("stage"),
                "why_now": a.get("why_now"), "signal": ls["title"] if ls else None,
                "signal_type": ls["type"] if ls else None,
                "recommended_action": a.get("recommended_action"),
                "owner_id": a.get("owner_id"), "has_risk": a["id"] in risk_account_ids,
            })

        return {
            "cards": {
                "hot_accounts": len(hot),
                "new_signals_24h": len([s for s in signals if self._recent(s.get("detected_at"))]),
                "outreach_ready": len(drafts),
                "calls_scheduled": len([c for c in calls if c.get("status") == "scheduled"]),
                "pipeline_opportunities": len([a for a in accounts if a.get("stage") == "opportunity"]),
                "accounts_with_risk": len(risk_account_ids),
            },
            "leaderboard": leaderboard,
            "recent_signals": signals[:8],
            "tasks": tasks[:10],
            "active_sequences": [s for s in sequences if s.get("status") == "active"][:6],
            "calls_today": [c for c in calls if c.get("status") in ("scheduled", "live")][:6],
            "risk_accounts": [
                {"account_id": r["account_id"], "title": r["title"], "severity": r["severity"]}
                for r in risks[:6]
            ],
        }

    @staticmethod
    def _recent(ts: str | None) -> bool:
        if not ts:
            return False
        from datetime import datetime, timezone
        try:
            dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            return (datetime.now(timezone.utc) - dt).total_seconds() < 86400
        except Exception:
            return False


dashboard_service = DashboardService()
