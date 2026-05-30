"""ScoringService — turns signals + ICP fit into the four sub-scores + overall.

overall = 0.30·fit + 0.30·intent + 0.25·timing + 0.10·engagement − 0.05·risk_penalty
(mirrors compute_overall_score() in the DB and the brief's formula).
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

# Which signal types drive which sub-score, and their base weight.
_INTENT_SIGNALS = {"hiring", "product", "pricing", "expansion", "techstack", "event",
                   "headcount", "competitor"}
_TIMING_SIGNALS = {"funding", "product", "hiring", "executive", "pricing", "investor",
                   "expansion", "partnership", "layoff"}
_RISK_SIGNALS = {"risk", "breach", "complaint", "layoff", "compliance"}

_SIGNAL_WEIGHT = {
    "funding": 28, "hiring": 24, "product": 22, "executive": 20, "pricing": 16,
    "expansion": 18, "partnership": 14, "techstack": 12, "competitor": 16,
    "event": 10, "news": 8, "headcount": 14, "layoff": 10, "revenue_proxy": 12,
    "investor": 16, "compliance": 12, "breach": 18, "complaint": 14,
    "trust_center": 8, "risk": 16,
}


def _clamp(v: float, lo: float = 0, hi: float = 100) -> float:
    return max(lo, min(hi, v))


def _age_decay(detected_at: str | None) -> float:
    """More recent signals weigh more (1.0 fresh -> ~0.4 after 60 days)."""
    if not detected_at:
        return 0.7
    try:
        dt = datetime.fromisoformat(detected_at.replace("Z", "+00:00"))
        days = (datetime.now(timezone.utc) - dt).days
    except Exception:
        return 0.7
    if days <= 1:
        return 1.0
    if days <= 7:
        return 0.9
    if days <= 30:
        return 0.75
    if days <= 60:
        return 0.55
    return 0.4


class ScoringService:
    def fit_score(self, account: dict[str, Any], icp: dict[str, Any]) -> float:
        """How well the account matches the ICP definition."""
        score = 40.0
        industries = [i.lower() for i in icp.get("industries", [])]
        if account.get("industry") and account["industry"].lower() in industries:
            score += 30
        elif industries:
            score += 8  # adjacent
        emp = account.get("employee_estimate") or 0
        rng = icp.get("employee_range", {})
        lo, hi = rng.get("min", 0), rng.get("max", 10_000_000)
        if lo <= emp <= hi:
            score += 22
        elif emp:
            score += 6
        # keyword presence in description
        desc = (account.get("description") or "").lower()
        kw = [k.lower() for k in icp.get("keywords", [])]
        score += min(8, sum(2 for k in kw if k in desc))
        return round(_clamp(score), 2)

    def score_signals(self, signals: list[dict[str, Any]]) -> dict[str, float]:
        intent = timing = risk = 0.0
        for s in signals:
            t = s.get("type", "news")
            w = _SIGNAL_WEIGHT.get(t, 8)
            conf = (s.get("confidence") or 50) / 100.0
            impact = (s.get("impact_score") or 50) / 100.0
            decay = _age_decay(s.get("detected_at"))
            contrib = w * conf * impact * decay
            if t in _INTENT_SIGNALS:
                intent += contrib
            if t in _TIMING_SIGNALS:
                timing += contrib * 1.1
            if t in _RISK_SIGNALS:
                risk += contrib * 0.9
        return {
            "intent": round(_clamp(intent), 2),
            "timing": round(_clamp(timing), 2),
            "risk_penalty": round(_clamp(risk), 2),
        }

    def compute(
        self,
        account: dict[str, Any],
        signals: list[dict[str, Any]],
        icp: dict[str, Any],
        *,
        engagement: float | None = None,
    ) -> dict[str, Any]:
        fit = self.fit_score(account, icp)
        sig = self.score_signals(signals)
        eng = engagement if engagement is not None else float(account.get("engagement_score") or 0)
        overall = round(
            0.30 * fit + 0.30 * sig["intent"] + 0.25 * sig["timing"]
            + 0.10 * eng - 0.05 * sig["risk_penalty"],
            2,
        )
        rationale = self._rationale(fit, sig, signals)
        return {
            "fit_score": fit,
            "intent_score": sig["intent"],
            "timing_score": sig["timing"],
            "engagement_score": round(eng, 2),
            "risk_penalty": sig["risk_penalty"],
            "overall_score": _clamp(overall),
            "rationale": rationale,
        }

    def _rationale(self, fit: float, sig: dict, signals: list[dict]) -> dict[str, Any]:
        top = sorted(
            signals,
            key=lambda s: _SIGNAL_WEIGHT.get(s.get("type", "news"), 8)
            * ((s.get("impact_score") or 50) / 100),
            reverse=True,
        )[:3]
        return {
            "fit": fit,
            "intent": sig["intent"],
            "timing": sig["timing"],
            "risk_penalty": sig["risk_penalty"],
            "top_signals": [{"type": s.get("type"), "title": s.get("title")} for s in top],
            "why_now": top[0]["summary"] if top else None,
        }


scoring_service = ScoringService()
