from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.auth import AuthContext, get_auth_context
from app.core.db import get_db
from app.services.workflows import workflow_service

router = APIRouter(prefix="/api/workflows", tags=["workflows"])


@router.get("")
async def list_workflows(ctx: AuthContext = Depends(get_auth_context)):
    db = get_db()
    rows = (await db.table("workflows").select("*").eq("team_id", ctx.team_id)
            .order("created_at", desc=True).limit(50).execute()).data or []
    return {"workflows": rows}


@router.post("/daily-monitor")
async def run_daily_monitor(ctx: AuthContext = Depends(get_auth_context)):
    """Run (or dispatch) the daily account-monitoring workflow."""
    return await workflow_service.daily_monitor(ctx.team_id)


class SignalRun(BaseModel):
    signal_id: str


@router.post("/signal-detected")
async def run_signal_detected(body: SignalRun, ctx: AuthContext = Depends(get_auth_context)):
    return await workflow_service.signal_detected(body.signal_id)


class SequenceRun(BaseModel):
    sequence_id: str


@router.post("/sequence-run")
async def run_sequence(body: SequenceRun, ctx: AuthContext = Depends(get_auth_context)):
    return await workflow_service.sequence_run(body.sequence_id)


class CallRun(BaseModel):
    call_id: str


@router.post("/call-completed")
async def run_call_completed(body: CallRun, ctx: AuthContext = Depends(get_auth_context)):
    return await workflow_service.call_completed(body.call_id)


# ---- Task queue (recommended actions surfaced by workflows) ----------------
@router.get("/tasks")
async def list_tasks(ctx: AuthContext = Depends(get_auth_context), status: str = "open"):
    db = get_db()
    rows = (await db.table("tasks").select("*").eq("team_id", ctx.team_id).eq("status", status)
            .order("priority").execute()).data or []
    return {"tasks": rows}


class TaskUpdate(BaseModel):
    status: str


@router.patch("/tasks/{task_id}")
async def update_task(task_id: str, body: TaskUpdate, ctx: AuthContext = Depends(get_auth_context)):
    db = get_db()
    from app.core.db import now_iso
    fields = {"status": body.status}
    if body.status == "done":
        fields["completed_at"] = now_iso()
    res = (await db.table("tasks").update(fields).eq("id", task_id).execute()).data
    return {"task": (res[0] if isinstance(res, list) and res else res)}
