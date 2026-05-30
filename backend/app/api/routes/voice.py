from __future__ import annotations

import asyncio

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.core.auth import AuthContext, get_auth_context
from app.core.db import get_db
from app.integrations.speechmatics_client import speechmatics_client
from app.services.copilot import copilot_service
from app.services.voice import voice_service

router = APIRouter(prefix="/api/voice", tags=["voice"])


@router.get("/prep")
async def prep(account_id: str | None = None, contact_id: str | None = None,
               ctx: AuthContext = Depends(get_auth_context)):
    return await voice_service.prep(account_id, contact_id)


class TranscriptSegment(BaseModel):
    call_id: str
    speaker: str = "prospect"
    text: str
    start_ms: int = 0
    end_ms: int = 0
    is_final: bool = True


@router.post("/transcript")
async def add_transcript(body: TranscriptSegment, ctx: AuthContext = Depends(get_auth_context)):
    return await voice_service.add_transcript(
        body.call_id, speaker=body.speaker, text=body.text,
        start_ms=body.start_ms, end_ms=body.end_ms, is_final=body.is_final,
    )


class CopilotRequest(BaseModel):
    text: str
    account_id: str | None = None


@router.post("/copilot")
async def copilot(body: CopilotRequest, ctx: AuthContext = Depends(get_auth_context)):
    account = None
    if body.account_id:
        db = get_db()
        a = (await db.table("accounts").select("*").eq("id", body.account_id).limit(1).execute()).data
        account = a[0] if a else None
    suggestion = await copilot_service.suggest(body.text, account=account)
    return {"copilot": suggestion}


@router.get("/speechmatics/config")
async def speechmatics_config(ctx: AuthContext = Depends(get_auth_context)):
    token = await speechmatics_client.create_temp_token()
    return {**token, "config": speechmatics_client.rt_config()}


@router.websocket("/ws/{call_id}")
async def voice_ws(websocket: WebSocket, call_id: str):
    """Live transcript + copilot channel.

    Mock mode (Speechmatics disabled): the server *plays* a scripted sales call,
    emitting transcript + copilot events with realistic pacing so the dialer demo
    runs with no audio hardware. Live mode: the client streams finalized
    Speechmatics segments and the server replies with copilot suggestions.
    """
    await websocket.accept()
    db = get_db()
    account = None
    call = (await db.table("calls").select("*").eq("id", call_id).limit(1).execute()).data
    if call and call[0].get("account_id"):
        a = (await db.table("accounts").select("*").eq("id", call[0]["account_id"]).limit(1).execute()).data
        account = a[0] if a else None

    # The browser requests a simulated conversation (?simulate=1) when it isn't
    # streaming live mic audio — so the call workspace always demonstrates the
    # transcript + copilot flow end-to-end.
    simulate = websocket.query_params.get("simulate") == "1"

    try:
        if simulate or not speechmatics_client.enabled:
            await websocket.send_json({"event": "mode", "mock": True})
            prev_ms = 0
            async for seg in speechmatics_client.mock_transcript():
                delay = min(3.0, max(0.6, (seg["ms"] - prev_ms) / 1000.0 * 0.6))
                prev_ms = seg["ms"]
                await asyncio.sleep(delay)
                res = await voice_service.add_transcript(
                    call_id, speaker=seg["speaker"], text=seg["text"],
                    start_ms=seg["ms"], end_ms=seg["ms"] + 1500, is_final=True,
                )
                await websocket.send_json({"event": "transcript", "segment": {
                    "speaker": seg["speaker"], "text": seg["text"], "ms": seg["ms"]}})
                if res.get("copilot"):
                    await websocket.send_json({"event": "copilot", "copilot": res["copilot"]})
            await websocket.send_json({"event": "done"})
        else:
            await websocket.send_json({"event": "mode", "mock": False})
            while True:
                data = await websocket.receive_json()
                res = await voice_service.add_transcript(
                    call_id, speaker=data.get("speaker", "prospect"), text=data.get("text", ""),
                    start_ms=data.get("start_ms", 0), end_ms=data.get("end_ms", 0),
                    is_final=data.get("is_final", True),
                )
                if res.get("copilot"):
                    await websocket.send_json({"event": "copilot", "copilot": res["copilot"]})
    except WebSocketDisconnect:
        return
    except Exception as exc:  # pragma: no cover
        await websocket.send_json({"event": "error", "detail": str(exc)})
        await websocket.close()
