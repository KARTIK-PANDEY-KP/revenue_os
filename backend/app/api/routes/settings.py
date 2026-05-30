from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.auth import AuthContext, get_auth_context
from app.core.config import settings as app_settings
from app.core.db import get_db

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("/integrations")
async def integrations(ctx: AuthContext = Depends(get_auth_context)):
    """Which sponsor integrations are live vs running on mock data."""
    status = app_settings.integration_status()
    labels = {
        "llm": "Claude (Anthropic)", "brightdata": "Bright Data", "cognee": "Cognee",
        "trigger": "Trigger.dev", "speechmatics": "Speechmatics", "livekit": "LiveKit",
        "supabase": "Supabase",
    }
    return {
        "integrations": [
            {"key": k, "label": labels.get(k, k), "live": v, "mode": "live" if v else "mock"}
            for k, v in status.items()
        ],
        "all_mock": not any(status.values()),
    }


@router.get("/team")
async def get_team(ctx: AuthContext = Depends(get_auth_context)):
    db = get_db()
    res = (await db.table("teams").select("*").eq("id", ctx.team_id).limit(1).execute()).data
    return {"team": res[0] if res else None}


class ICPUpdate(BaseModel):
    icp: dict


@router.put("/icp")
async def update_icp(body: ICPUpdate, ctx: AuthContext = Depends(get_auth_context)):
    db = get_db()
    res = (await db.table("teams").update({"icp": body.icp}).eq("id", ctx.team_id).execute()).data
    return {"team": (res[0] if isinstance(res, list) and res else res)}


class TeamSettings(BaseModel):
    settings: dict


@router.put("/team")
async def update_team_settings(body: TeamSettings, ctx: AuthContext = Depends(get_auth_context)):
    db = get_db()
    res = (await db.table("teams").update({"settings": body.settings}).eq("id", ctx.team_id).execute()).data
    return {"team": (res[0] if isinstance(res, list) and res else res)}


@router.get("/playbooks")
async def list_playbooks(ctx: AuthContext = Depends(get_auth_context)):
    db = get_db()
    rows = (await db.table("playbooks").select("*").eq("team_id", ctx.team_id).execute()).data or []
    return {"playbooks": rows}


class PlaybookCreate(BaseModel):
    name: str
    persona: str | None = None
    objective: str | None = None
    tone: str = "consultative"
    content: dict = {}


@router.post("/playbooks")
async def create_playbook(body: PlaybookCreate, ctx: AuthContext = Depends(get_auth_context)):
    db = get_db()
    row = {"team_id": ctx.team_id, "created_by": ctx.user_id, **body.model_dump()}
    res = (await db.table("playbooks").insert(row).execute()).data
    return {"playbook": (res[0] if isinstance(res, list) and res else res)}
