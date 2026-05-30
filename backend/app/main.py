"""RevenueOS backend — FastAPI application entrypoint."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import IntegrationNotConfigured, settings
from app.core.db import init_db
from app.core.logging import get_logger, setup_logging

log = get_logger("app")


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001
    setup_logging()
    await init_db()
    from app.core.bootstrap import ensure_default_team

    await ensure_default_team()
    status = settings.integration_status()
    live = [k for k, v in status.items() if v]
    mock = [k for k, v in status.items() if not v]
    log.info("RevenueOS backend up. live=%s mock=%s", live or "none", mock or "none")
    yield


app = FastAPI(
    title="RevenueOS API",
    version="0.1.0",
    description="AI-native GTM workspace — accounts, signals, sequences, calls, coaching.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(IntegrationNotConfigured)
async def integration_not_configured(request: Request, exc: IntegrationNotConfigured):
    return JSONResponse(status_code=503, content={"error": "integration_not_configured",
                                                  "detail": str(exc)})


@app.get("/health", tags=["meta"])
async def health() -> dict:
    return {
        "status": "ok",
        "service": "revenueos-backend",
        "integrations": settings.integration_status(),
        "mock_mode": not any(settings.integration_status().values()),
    }


# ---- Routers ---------------------------------------------------------------
from app.api.routes import (  # noqa: E402
    accounts,
    auth,
    calls,
    coaching,
    dashboard,
    outreach,
    prospecting,
    sequences,
    settings as settings_routes,
    signals,
    voice,
    workflows,
)

app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(accounts.router)
app.include_router(signals.router)
app.include_router(prospecting.router)
app.include_router(sequences.router)
app.include_router(outreach.router)
app.include_router(calls.router)
app.include_router(coaching.router)
app.include_router(voice.router)
app.include_router(workflows.router)
app.include_router(settings_routes.router)
