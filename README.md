<div align="center">

# RevenueOS

### AI-Native GTM Workspace

**Find high-intent accounts → understand *why now* → prioritize → personalize outreach → run sequences → assist live calls → learn from every interaction.**

A Nooks-style outbound platform, rebuilt around a sponsor intelligence stack.

`Bright Data` · `Cognee` · `Trigger.dev` · `LiveKit` · `Speechmatics` · `Claude` · `Supabase`

</div>

---

## What it does

RevenueOS answers the seven questions a revenue team asks every day:

> Who should I contact today? · Why now? · What should I say? · Should I call or email? · What happened on the call? · What should I do next? · How do I improve?

| Module | What it does | Powered by |
| --- | --- | --- |
| **Dashboard** | Command center: hot accounts, fresh signals, today's priorities | all |
| **Account Intelligence** | Full company dossier — overview, signals, people, outreach, calls, timeline, risk | Bright Data + Cognee + Claude |
| **Research Engine** | Web research, hiring/funding/pricing/competitor monitoring | **Bright Data** |
| **Signal Engine** | Normalizes web data into typed GTM/finance/security signals | Bright Data + Claude |
| **Lead Prioritization** | Fit · Intent · Timing · Risk → composite score + leaderboard | Scoring service |
| **Prospecting** | Plain-language ICP → discovered, researched, ranked accounts | **Bright Data** + Claude |
| **AI Sequencing** | Multi-channel cadences with durable, multi-day automation | **Trigger.dev** |
| **Personalization** | Hyper-specific emails, LinkedIn, call openers, voicemails, rebuttals | Claude + Cognee |
| **AI Dialer** | Browser calling with live transcript + AI copilot | **LiveKit** + **Speechmatics** |
| **Coaching** | Scorecards, transcripts, objection patterns, AI roleplay | **Speechmatics** + Claude |
| **Memory** | Persistent knowledge graph across every entity + interaction | **Cognee** |
| **Workflows** | Daily monitoring, signal handling, sequence + follow-up automation | **Trigger.dev** |

## Architecture

```
┌──────────────┐     proxy /backend/*     ┌─────────────────────────────┐
│  Next.js 15  │ ───────────────────────► │       FastAPI backend        │
│  (frontend)  │ ◄─── WebSocket (dialer)── │  services + integrations     │
└──────────────┘                          └───────────┬─────────────────┘
       │                                               │
   Supabase Auth                       ┌───────────────┼──────────────────────────┐
                                        ▼               ▼              ▼            ▼
                                  Bright Data       Cognee          Claude     LiveKit /
                                 (web data)      (memory graph)   (reasoning)  Speechmatics
                                        │
                                        ▼
                                  Trigger.dev  ── durable workflows ──► calls back into API
                                        │
                                        ▼
                                   Supabase Postgres  (schema in /supabase)
```

**Real providers by default.** RevenueOS uses the live sponsor APIs — Bright Data, Cognee, Trigger.dev, LiveKit, Speechmatics, Claude, Supabase. With keys set, every feature runs on **real data**; without a given key, the relevant endpoint returns a clear `503` (it never serves fake data). For offline development only, `REVENUEOS_ALLOW_MOCK=true` enables an in-memory store + mock provider responses — leave it **off** in any real or judged environment.

```
revenue_os/
├── backend/      FastAPI · services · sponsor integrations · in-memory + Supabase DB
├── frontend/     Next.js 15 App Router · "The Revenue Almanac" editorial UI
├── trigger/      Trigger.dev v3 workflows (TypeScript)
├── supabase/     full schema as migrations + demo seed (apply when keys arrive)
├── docs/         architecture · sponsor usage · demo script
└── scripts/      dev runner
```

## Quickstart — one command

```bash
cp .env.example backend/.env           # add your provider keys
./start.sh                             # installs anything missing, runs backend + frontend
```

`./start.sh` creates the Python venv + installs backend deps, installs frontend deps,
copies env templates if needed, then starts **both** servers (Ctrl-C stops everything).
Open **http://localhost:3000**. Options: `WITH_TRIGGER=1 ./start.sh` also starts the
Trigger.dev dev server; `BACKEND_PORT=… FRONTEND_PORT=… ./start.sh` overrides ports.

<details><summary>Manual (two terminals)</summary>

```bash
# Backend (Python 3.12)
cd backend && uv venv --python 3.12 .venv && source .venv/bin/activate
uv pip install -e ".[dev]" && uvicorn app.main:app --reload   # :8000

# Frontend
cd frontend && npm install && npm run dev                      # :3000
```
…or `make setup && make dev`.
</details>

With keys set + Supabase migrated, open **http://localhost:3000** and the product runs on
**live data**: research a real company (Bright Data), watch signals + scoring populate,
generate a sequence (Trigger.dev), and place a call with live transcription (LiveKit +
Speechmatics) and an AI copilot. `GET /health` shows which providers are live.

> **Offline development only:** `REVENUEOS_ALLOW_MOCK=true uvicorn app.main:app` runs the
> whole app against an in-memory store + mock provider responses (no keys, no DB). This is
> a dev convenience — keep it off in any real or judged run. `make test` uses this mode.

## Going live — the keys I need from you

Drop these into `.env` (see [`.env.example`](.env.example)). Each is independent; add what you have.

| Sponsor | Env vars | Get it from |
| --- | --- | --- |
| **Claude** | `ANTHROPIC_API_KEY` | console.anthropic.com |
| **Bright Data** | `BRIGHTDATA_API_TOKEN` (+ zone names) | brightdata.com dashboard |
| **Cognee** | `COGNEE_API_KEY` *or* self-host (`make cognee`) | cognee.ai / docker |
| **Trigger.dev** | `TRIGGER_PROJECT_REF`, `TRIGGER_SECRET_KEY`, `TRIGGER_ACCESS_TOKEN` | trigger.dev dashboard |
| **Speechmatics** | `SPEECHMATICS_API_KEY` | portal.speechmatics.com |
| **LiveKit** | `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | cloud.livekit.io |
| **Supabase** | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL` | supabase.com project settings |

**Supabase setup** (I built migrations, not a live DB, per your instruction):

```bash
make db-migrate     # applies supabase/migrations/*.sql against $DATABASE_URL
make db-seed        # optional demo data
```

See [`supabase/README.md`](supabase/README.md) for CLI vs psql options. Verify live status anytime on the **Settings** page or `GET /health`.

## Docs

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system design, data flow, services
- [docs/SPONSORS.md](docs/SPONSORS.md) — exactly how each sponsor is used
- [docs/DEMO.md](docs/DEMO.md) — the 90-second demo script
- [trigger/README.md](trigger/README.md) — the four workflows
- [supabase/README.md](supabase/README.md) — schema + how to apply it

## Tracks

**Primary: GTM Intelligence** — discovery, enrichment, signals, prioritization, outreach, calling, coaching, pipeline. **Secondary: Finance & Market Intelligence** — funding, headcount, layoffs, investor, revenue-proxy signals. **Optional: Security & Compliance** — breach/compliance/trust-center/vendor-risk flags that reshape messaging.
