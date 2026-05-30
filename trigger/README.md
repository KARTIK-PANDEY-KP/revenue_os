# RevenueOS — Trigger.dev workflows

The orchestration engine. Four durable workflows drive RevenueOS's background
automation. Each task calls back into the FastAPI backend (`../backend`) so the
domain logic lives in one place and runs identically whether orchestration is
inline (mock mode) or via Trigger.dev (live).

| Task id            | Trigger                | What it does                                                        |
| ------------------ | ---------------------- | ------------------------------------------------------------------- |
| `daily-monitor`    | Schedule (`0 8 * * *`) | Research watched accounts, extract new signals, re-score, fan out   |
| `signal-detected`  | Event (per signal)     | Classify → recommend action → draft outreach / create call task     |
| `sequence-run`     | Event (per sequence)   | Durable multi-day sequence with `wait.for` between steps + branching |
| `call-completed`   | Event (per call)       | Transcribe → summarize → scorecard → follow-up email → next task     |

Uses **Trigger.dev v4**. The project ref is baked into `trigger.config.ts`
(`proj_wedjfsjeupvwzsphqsfd`) and is overridable via `TRIGGER_PROJECT_REF`.

## Setup

```bash
cd trigger
npm install
npx trigger.dev@latest login    # one-time browser login
```

Env (the tasks call back into the backend):

```
BACKEND_URL=http://localhost:8000
REVENUEOS_TEAM_ID=00000000-0000-0000-0000-0000000000aa
```

## Run locally (dev environment)

```bash
npx trigger.dev@latest dev      # registers tasks + runs them on a local worker
```

With the backend's `TRIGGER_SECRET_KEY=tr_dev_…`, dispatches go to the **dev**
environment and execute on this worker — visible live in the dashboard.
`WITH_TRIGGER=1 ./start.sh` (repo root) starts this alongside the app.

## Deploy (production)

```bash
npx trigger.dev@latest deploy   # → "Version … deployed with 5 detected tasks"
```

Already deployed for this project. To dispatch to the **deployed prod** tasks (no
local worker needed), set the backend's `TRIGGER_SECRET_KEY` to a **production**
key (`tr_prod_…`, from dashboard → Project → API Keys → Production).

## How dispatch works

The backend dispatches via the REST API (`POST /api/v1/tasks/{id}/trigger`) using
`TRIGGER_SECRET_KEY` — verified live (`mock: false`, real `run_…` handle). Without
a key set, the backend runs the equivalent logic inline so the product still works.
