# RevenueOS — Backend (FastAPI)

Async FastAPI service: research, signals, scoring, memory, outreach, sequences,
voice, coaching, and workflow orchestration. Every sponsor integration has a mock
fallback, so this runs with **no keys and no database** (in-memory store seeded
with demo data).

## Run

```bash
uv venv --python 3.12 .venv && source .venv/bin/activate
uv pip install -e ".[dev]"          # add ".[cognee]" for the native Cognee SDK
uvicorn app.main:app --reload       # → http://localhost:8000  (docs at /docs)
```

Reads env from `backend/.env` or the repo-root `.env` (see `../.env.example`).

## Test

```bash
REVENUEOS_FORCE_MOCK=true python -m pytest -q
```

## Layout

- `app/core` — config, logging, db (Supabase | in-memory), llm (Claude), auth, seed
- `app/integrations` — brightdata, cognee, livekit, speechmatics, trigger (+ mocks)
- `app/services` — domain logic (research, signals, scoring, memory, outreach,
  sequences, voice, copilot, coaching, prospecting, workflows, dashboard)
- `app/api/routes` — REST + the dialer WebSocket

## Health

`GET /health` reports which integrations are live vs mock. The **Settings** page in
the frontend renders the same status.
