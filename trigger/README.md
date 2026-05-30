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

## Setup

```bash
cd trigger
npm install
# Log in + select your project (creates/links proj ref)
npx trigger.dev@latest login
npx trigger.dev@latest dev      # local dev — runs tasks against your backend
```

Set these env vars (see root `.env.example`):

```
TRIGGER_PROJECT_REF=proj_xxx
TRIGGER_SECRET_KEY=tr_dev_xxx
BACKEND_URL=http://localhost:8000        # where these tasks call back to
REVENUEOS_TEAM_ID=00000000-0000-0000-0000-0000000000aa
```

## Deploy

```bash
npx trigger.dev@latest deploy
```

When `TRIGGER_ACCESS_TOKEN` / `TRIGGER_SECRET_KEY` is set on the **backend**, the
backend dispatches these tasks (e.g. launching a sequence triggers `sequence-run`).
Without it, the backend runs the equivalent logic inline so the demo still works.
