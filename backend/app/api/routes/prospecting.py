from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.auth import AuthContext, get_auth_context
from app.core.config import settings
from app.services.prospecting import prospecting_service
from app.services.research import account_research_service

router = APIRouter(prefix="/api/prospecting", tags=["prospecting"])


class ProspectRequest(BaseModel):
    query: str
    limit: int = 4


@router.post("/search")
async def prospect(body: ProspectRequest, ctx: AuthContext = Depends(get_auth_context)):
    """ICP query -> discovered, researched, ranked accounts with openers."""
    return await prospecting_service.search(ctx.team_id, body.query, limit=body.limit,
                                            owner_id=ctx.user_id)


# Rotating "what we're doing now" lines shown while research runs (live web work
# takes ~60-90s/company, so we keep the UI talking while it happens).
_STAGES = [
    "Searching the live web…",
    "Reading careers, pricing & news pages…",
    "Extracting buying signals…",
    "Finding decision-makers…",
    "Scoring fit, intent & timing…",
    "Cross-checking against your ICP…",
    "Ranking by buying intent…",
]


@router.get("/stream")
async def prospect_stream(query: str, limit: int = 4, team_id: str | None = None):
    """Server-Sent Events stream of prospecting progress.

    Emits: status / discovered / tick (heartbeat) / result / done — so the UI can
    show a live, moving progress experience instead of a frozen spinner.
    Auth-light (EventSource can't send headers): defaults to the demo team.
    """
    tid = team_id or settings.demo_team_id

    def sse(event: str, data: dict) -> str:
        return f"event: {event}\ndata: {json.dumps(data)}\n\n"

    async def gen():
        yield sse("status", {"message": "Understanding your ICP…"})
        candidates = await prospecting_service._discover(query, limit)
        names = [c["name"] for c in candidates[:limit]]
        total = len(names) or 1
        yield sse("discovered", {"companies": names, "total": total})

        async def one(name: str):
            try:
                res = await account_research_service.research(tid, name)
                a = res["account"]
                contacts = res["contacts"]
                opener = (contacts[0].get("suggested_opener") if contacts else None) or a.get("recommended_action")
                return {
                    "account": a,
                    "decision_makers": contacts[:3],
                    "signals": res["signals"][:3],
                    "suggested_opener": opener,
                    "confidence": a.get("overall_score"),
                }
            except Exception:
                return None

        tasks = [asyncio.create_task(one(n)) for n in names]
        pending = set(tasks)
        results = []
        done = 0
        stage_i = 0
        while pending:
            finished, pending = await asyncio.wait(pending, timeout=2.0,
                                                   return_when=asyncio.FIRST_COMPLETED)
            for fut in finished:
                r = fut.result()
                done += 1
                if r:
                    results.append(r)
                    yield sse("result", {
                        "result": r, "done": done, "total": total,
                        "message": f"Scored {r['account'].get('name')} · {round(r['confidence'] or 0)}",
                    })
                else:
                    yield sse("tick", {"done": done, "total": total,
                                       "message": "Skipped a low-confidence match…"})
            if pending:
                yield sse("tick", {"done": done, "total": total,
                                   "message": _STAGES[stage_i % len(_STAGES)]})
                stage_i += 1

        results.sort(key=lambda r: r["account"].get("overall_score", 0), reverse=True)
        yield sse("done", {"results": results, "count": len(results)})

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"},
    )
