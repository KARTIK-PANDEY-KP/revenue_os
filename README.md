<div align="center">

# RevenueOS

### The AI-Native GTM Workspace

**Find high-intent accounts → understand _why now_ → prioritize → personalize outreach → run sequences → assist live calls → learn from every interaction.**

A Nooks-style outbound platform, rebuilt around a live web-intelligence + memory + voice stack.

`Bright Data` · `Cognee` · `Trigger.dev` · `LiveKit` · `Speechmatics` · `Claude` · `Supabase`

</div>

---

## Table of contents

1. [What is RevenueOS](#1-what-is-revenueos)
2. [The vision](#2-the-vision)
3. [What it does — the modules](#3-what-it-does--the-modules)
4. [The intelligence stack (who does what)](#4-the-intelligence-stack-who-does-what)
5. [Architecture](#5-architecture)
6. [Quickstart — one command](#6-quickstart--one-command)
7. [Environment variables — the complete reference](#7-environment-variables--the-complete-reference)
8. [Provider setup notes](#8-provider-setup-notes)
9. [Database (Supabase) setup](#9-database-supabase-setup)
10. [Running, testing & verifying](#10-running-testing--verifying)
11. [Project structure](#11-project-structure)
12. [The 90-second demo](#12-the-90-second-demo)
13. [Tech stack & further docs](#13-tech-stack--further-docs)

---

## 1. What is RevenueOS

RevenueOS is an **AI outbound workspace** for revenue teams. Point it at a company name (or describe your ideal customer in plain English) and it:

- **researches** the company across the live web,
- **detects buying signals** (hiring, funding, product launches, pricing changes, new execs, risk flags…),
- **scores and ranks** accounts by fit, intent, timing and risk,
- **writes personalized outreach** grounded in what actually changed,
- **runs multi-day sequences** automatically,
- **powers live browser calls** with real-time transcription and an AI copilot,
- **coaches reps** with scorecards and roleplay,
- and **remembers everything** in a knowledge graph so it gets smarter over time.

It answers the seven questions a revenue team asks every single day:

> **Who should I contact today? · Why now? · What should I say? · Should I call or email? · What happened on the call? · What should I do next? · How do I improve?**

---

## 2. The vision

Outbound sales is drowning in tools and starved of judgment. Reps have a CRM, a sequencer, a dialer, a data vendor, a notetaker — none of which talk to each other, and none of which know _why_ an account matters _this week_. The result: reps spray generic messages at stale lists and burn their ramp time on the wrong accounts.

RevenueOS is built on a different premise: **the web already tells you who to call and why — you just need an agent that reads it, remembers it, acts on it, and learns from the outcome.**

- **Live, not stale.** Every account is researched against the real web at the moment you need it — not a quarterly data dump.
- **Why-now, not just who.** A name and a title aren't a reason to call. A hiring spike, a funding round, a pricing change, a new exec — _that's_ a reason. RevenueOS surfaces the trigger and ties the message to it.
- **One brain, not ten tools.** Discovery, enrichment, scoring, outreach, calling, and coaching share one memory. The call you had yesterday informs the email you send tomorrow.
- **It compounds.** Every signal, call, and reply is written to a knowledge graph, so the system reasons over history instead of starting cold — and learns which plays actually win.

The north star: a rep opens RevenueOS in the morning and it already knows the three accounts most likely to convert today, why, and exactly what to say.

---

## 3. What it does — the modules

| Module | What it does | Powered by |
| --- | --- | --- |
| **Dashboard** | Command center — hot accounts, fresh signals, today's priority actions, live signal ticker | all |
| **Account Intelligence** | Full company dossier across 7 tabs: Overview, Signals, People, Outreach, Calls, Timeline, Risk | Bright Data + Cognee + Claude |
| **Research Engine** | Searches the web, scrapes company pages (home, pricing, careers, blog), captures provenance | **Bright Data** |
| **Signal Engine** | Normalizes raw web content into typed signals (GTM, finance, security) with confidence + impact | Bright Data + Claude |
| **Lead Prioritization** | `fit · intent · timing · risk` → composite score + ranked leaderboard | Scoring service |
| **Prospecting** | Plain-language ICP → discovered, researched, ranked accounts with openers | **Bright Data** + Claude |
| **AI Sequencing** | Multi-channel cadences (email/call/LinkedIn) with durable, multi-day automation | **Trigger.dev** |
| **Personalization** | Hyper-specific emails, LinkedIn notes, call openers, voicemails, objection rebuttals | Claude + Cognee |
| **AI Dialer** | Browser calling with live transcript + a copilot that fires battlecards on objections | **LiveKit** + **Speechmatics** |
| **Coaching** | Call scorecards, transcripts, objection patterns, rep leaderboard, AI roleplay | **Speechmatics** + Claude |
| **Memory** | Persistent knowledge graph across every company, person, signal, call, and email | **Cognee** |
| **Workflows** | Daily account monitoring, signal handling, sequence execution, post-call follow-up | **Trigger.dev** |

**Tracks / positioning.** Primary: **GTM Intelligence** (discovery → enrichment → signals → prioritization → outreach → calling → coaching → pipeline). Secondary: **Finance & Market Intelligence** (funding, headcount, layoffs, investor, revenue-proxy signals). Optional: **Security & Compliance** (breach / compliance / trust-center / vendor-risk flags that reshape messaging).

---

## 4. The intelligence stack (who does what)

Each provider has a load-bearing role — this isn't a thin wrapper around one API.

- **Bright Data** — the data engine. SERP API (search/discovery) + Web Unlocker (page scraping) power all research, signal evidence, decision-maker discovery, and prospecting. Every captured page is stored with provenance so the UI can always show _where a claim came from_.
- **Cognee** — memory + knowledge graph. Stores every company, person, signal, call, and email as graph nodes/edges and answers "why is X a priority?" by recalling related context. Runs locally (native engine) using Claude for extraction + on-device embeddings.
- **Claude (Anthropic)** — the reasoning layer. Tiered by task (Opus / Sonnet / Haiku): research synthesis, signal extraction (structured tool output), personalization, sequence planning, call summaries, scorecards, and the live copilot.
- **Trigger.dev** — the orchestration engine. Durable, long-running workflows: scheduled account monitoring, signal-triggered actions, multi-day sequences with real waits, and post-call follow-up.
- **LiveKit** — real-time voice transport for the browser dialer and AI-SDR sessions.
- **Speechmatics** — real-time speech-to-text feeding the live copilot, summaries, objection detection, and coaching.
- **Supabase** — Postgres (RLS-isolated per team) + Auth.

> See [`docs/SPONSORS.md`](docs/SPONSORS.md) for the exact code paths and API usage per provider.

---

## 5. Architecture

```
┌──────────────┐     proxy /backend/*      ┌──────────────────────────────┐
│  Next.js 16  │ ────────────────────────► │        FastAPI backend        │
│  (frontend)  │ ◄──── WebSocket (dialer) ──│   services + integrations     │
└──────┬───────┘                           └───────────────┬──────────────┘
   Supabase Auth                                           │
                          ┌──────────────┬─────────────────┼──────────────┬─────────────┐
                          ▼              ▼                 ▼              ▼             ▼
                     Bright Data      Cognee            Claude        LiveKit /     Supabase
                     (web data)    (graph memory)     (reasoning)   Speechmatics    Postgres
                          │
                          ▼
                     Trigger.dev ── durable workflows ──► call back into the API
```

**Design principle — real providers by default, never fake data.** With keys set, every feature runs on **live data**. Without a given key, the relevant endpoint returns a clear `503` (`IntegrationNotConfigured`) — it never silently serves mock data. Missing providers degrade cleanly and independently (e.g. no Cognee key → memory writes are skipped, research still works). An explicit, **off-by-default** `REVENUEOS_ALLOW_MOCK=true` flag exists for offline development only.

The browser talks to the backend through a Next.js rewrite (`/backend/* → FastAPI`) to stay same-origin; the dialer uses a direct WebSocket for live transcript + copilot streaming.

---

## 6. Quickstart — one command

```bash
git clone https://github.com/KARTIK-PANDEY-KP/revenue_os.git
cd revenue_os

cp .env.example backend/.env            # 1. add your provider keys (see §7)
# (optional) apply the DB schema once you have a Supabase URL — see §9

./start.sh                              # 2. installs anything missing, runs everything
```

`./start.sh` is the single entry point. It:
1. checks prerequisites (`uv`, `node`, `npm`),
2. creates the Python 3.12 venv + installs backend deps if missing,
3. installs frontend deps if missing,
4. copies env templates if absent,
5. starts the **backend** (`:8000`) and **frontend** (`:3000`) together.

Press **Ctrl-C** to stop everything. Then open **http://localhost:3000**.

**Options:**
```bash
WITH_TRIGGER=1 ./start.sh                       # also start the Trigger.dev dev server
BACKEND_PORT=8080 FRONTEND_PORT=3001 ./start.sh # override ports if 8000/3000 are taken
```

**Prerequisites:** [`uv`](https://docs.astral.sh/uv/) (Python 3.12 toolchain), Node 20+, npm. A Postgres/Supabase connection string for persistence (without one, set `REVENUEOS_ALLOW_MOCK=true` for an in-memory dev run).

<details><summary>Manual run (two terminals)</summary>

```bash
# Backend
cd backend && uv venv --python 3.12 .venv && source .venv/bin/activate
uv pip install -e ".[dev]"          # add ".[cognee]" for native graph memory
uvicorn app.main:app --reload       # → http://localhost:8000  (API docs at /docs)

# Frontend
cd frontend && npm install && npm run dev   # → http://localhost:3000
```
…or `make setup && make dev` from the repo root.
</details>

---

## 7. Environment variables — the complete reference

Two env files (both **gitignored** — never commit real keys):

- **`backend/.env`** — everything server-side (the FastAPI backend reads this; Cognee + LiteLLM also read it).
- **`frontend/.env.local`** — only the browser-exposed `NEXT_PUBLIC_*` vars.

Copy the templates: `cp .env.example backend/.env` and `cp frontend/.env.local.example frontend/.env.local`. Every integration is **independent** — fill in what you have; the rest return `503` until configured. Check live status anytime at `GET /health` or on the **Settings** page.

### Core LLM — Claude (Anthropic)
| Variable | Required | Description | Where to get it |
| --- | --- | --- | --- |
| `ANTHROPIC_API_KEY` | for AI features | Powers research synthesis, signal extraction, personalization, scorecards, copilot | [console.anthropic.com](https://console.anthropic.com) |
| `LLM_MODEL_DEEP` | no | Deep-reasoning model (default `claude-opus-4-8`) | — |
| `LLM_MODEL_BALANCED` | no | Default workhorse (default `claude-sonnet-4-6`) | — |
| `LLM_MODEL_FAST` | no | Low-latency model for the live copilot (default `claude-haiku-4-5-20251001`) | — |

### Bright Data — web data engine
| Variable | Required | Description | Where to get it |
| --- | --- | --- | --- |
| `BRIGHTDATA_API_TOKEN` | for research | Account API token (used for all zones) | Bright Data dashboard → Settings → API tokens |
| `BRIGHTDATA_WEB_UNLOCKER_ZONE` | for research | Name of your **Web Unlocker** zone (e.g. `web_unlocker1`) | created in the dashboard (see §8) |
| `BRIGHTDATA_SERP_ZONE` | for discovery | Name of your **SERP API** zone (e.g. `serp_api1`). Leave blank to fall back to Web-Unlocker-only research | created in the dashboard (see §8) |

### Cognee — memory / knowledge graph
| Variable | Required | Description |
| --- | --- | --- |
| `COGNEE_NATIVE` | recommended | `true` runs the local native engine (no cloud key needed) |
| `LLM_PROVIDER` / `LLM_MODEL` / `LLM_API_KEY` | for native | Cognee's graph-extraction LLM — set to `anthropic` / a Claude model / your `ANTHROPIC_API_KEY` |
| `EMBEDDING_PROVIDER` / `EMBEDDING_MODEL` / `EMBEDDING_DIMENSIONS` | for native | Local embeddings, e.g. `fastembed` / `sentence-transformers/all-MiniLM-L6-v2` / `384` (no OpenAI needed) |
| `COGNEE_API_KEY` / `COGNEE_API_URL` | alt | Use these instead for Cognee Cloud or a self-hosted server |

### Trigger.dev — workflow engine
| Variable | Required | Description | Where to get it |
| --- | --- | --- | --- |
| `TRIGGER_SECRET_KEY` | to dispatch | Project secret key (`tr_dev_…`) the backend uses to trigger runs | trigger.dev dashboard → Project → API keys |
| `TRIGGER_ACCESS_TOKEN` | to dispatch | Same as above, or a token with run-trigger scope | — |
| `TRIGGER_PROJECT_REF` | to deploy | Project reference (`proj_…`); read by `trigger.config.ts` | trigger.dev dashboard → Project settings |

### Speechmatics — real-time transcription
| Variable | Required | Description | Where to get it |
| --- | --- | --- | --- |
| `SPEECHMATICS_API_KEY` | for calls | Mints short-lived JWTs for browser-side real-time transcription | [portal.speechmatics.com](https://portal.speechmatics.com) |
| `SPEECHMATICS_RT_URL` | no | Real-time WS endpoint (default `wss://eu2.rt.speechmatics.com/v2`) | — |

### LiveKit — voice transport
| Variable | Required | Description | Where to get it |
| --- | --- | --- | --- |
| `LIVEKIT_URL` | for calls | Your LiveKit server URL (`wss://….livekit.cloud`) | [cloud.livekit.io](https://cloud.livekit.io) |
| `LIVEKIT_API_KEY` | for calls | API key (signs room tokens) | LiveKit project settings |
| `LIVEKIT_API_SECRET` | for calls | API secret | LiveKit project settings |

### Supabase — database + auth
| Variable | Required | Description | Where to get it |
| --- | --- | --- | --- |
| `DATABASE_URL` | for persistence | Direct Postgres connection string (the backend uses asyncpg) | Supabase → Project Settings → Database → Connection string |
| `SUPABASE_URL` | optional | Project URL `https://<ref>.supabase.co` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | optional | Service-role key (alternative REST backend; bypasses RLS) | Supabase → Project Settings → API |
| `SUPABASE_PROJECT_REF` | optional | Project reference id | Supabase → Project Settings |

> The backend prefers `DATABASE_URL` (asyncpg). If only `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set, it uses the Supabase REST client instead.

### App config
| Variable | Default | Description |
| --- | --- | --- |
| `REVENUEOS_ALLOW_MOCK` | `false` | **Dev only.** `true` enables an in-memory store + mock provider responses (no keys, no DB). Keep **off** in real/judged runs. |
| `REVENUEOS_FORCE_MOCK` | `false` | Force mocks even when keys exist (offline demo of a keyed setup). |
| `BACKEND_PORT` / `FRONTEND_PORT` | `8000` / `3000` | Server ports. |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated allowed origins. |

### Frontend (`frontend/.env.local`)
| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_BACKEND_URL` | yes | Backend base URL (dev proxy + dialer WebSocket), e.g. `http://localhost:8000` |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | no | Enable Supabase Auth login. Leave blank to run in **demo auth mode** (no login required). |
| `NEXT_PUBLIC_LIVEKIT_URL` | no | LiveKit URL for the in-browser dialer |

---

## 8. Provider setup notes

A few providers need a one-time setup step beyond pasting a key.

**Bright Data — create two zones** (in the dashboard → _Web Access / Proxies_):
1. A **Web Unlocker** zone (for page scraping). Note its name → `BRIGHTDATA_WEB_UNLOCKER_ZONE`.
2. A **SERP API** zone with **Data format: Full JSON** (for search/discovery). Note its name → `BRIGHTDATA_SERP_ZONE`.

The single account `BRIGHTDATA_API_TOKEN` works across both zones. If you only create the Web Unlocker zone, leave `BRIGHTDATA_SERP_ZONE` blank — research falls back to deriving the company domain and scraping its pages directly (no search-based discovery, but still fully live).

**Cognee — native (local) mode** is the default here: set `COGNEE_NATIVE=true` and the Cognee `LLM_*` / `EMBEDDING_*` vars (Anthropic + fastembed). First run downloads a small embedding model. Data persists locally under `~/.cognee`. Install the extra: `uv pip install -e ".[cognee]"`.

**Trigger.dev — deploy the workflows** (so dispatch hits durable cloud runs instead of running inline):
```bash
cd trigger
npm install
npx trigger.dev@latest login        # one-time, opens a browser
TRIGGER_PROJECT_REF=proj_xxx npx trigger.dev@latest deploy
```
The backend already dispatches to these tasks using `TRIGGER_SECRET_KEY`. Until deployed, workflows run **inline** in the backend (the product still works end-to-end).

---

## 9. Database (Supabase) setup

The full schema lives as ordered migrations in [`supabase/migrations`](supabase/migrations) (tables, RLS policies, triggers, views). Apply them once to your project:

```bash
# Option A — make targets (uses $DATABASE_URL from backend/.env)
make db-migrate

# Option B — Supabase CLI
supabase link --project-ref <your-ref> && supabase db push

# Option C — plain psql
for f in supabase/migrations/*.sql; do psql "$DATABASE_URL" -f "$f"; done
```

On first boot the backend bootstraps a default team + system user (idempotent). **No demo accounts/signals are inserted** — the dashboard starts empty and fills with real data as you research companies. See [`supabase/README.md`](supabase/README.md) for details and the multi-tenant/RLS design.

---

## 10. Running, testing & verifying

```bash
./start.sh                  # run everything (see §6)
make dev                    # backend + frontend (alternative)
make backend                # backend only (:8000, /docs for API)
make frontend               # frontend only (:3000)
make test                   # backend test suite (forced-mock, no keys needed)
make build                  # production-build the frontend
```

- **Health / live status:** `GET http://localhost:8000/health` returns which integrations are live vs unconfigured. The **Settings** page renders the same.
- **API docs:** interactive OpenAPI at `http://localhost:8000/docs`.
- **First real run:** with keys set + DB migrated, open the dashboard, type a real company (e.g. _Cursor_, _Ramp_, _Vercel_) in the research bar, and watch live Bright Data → signals → scoring → Supabase populate.

---

## 11. Project structure

```
revenue_os/
├── start.sh           # one-command local launcher
├── Makefile           # setup / run / test / db targets
├── .env.example       # backend env template
├── backend/           # FastAPI
│   └── app/
│       ├── core/          config · db (Postgres | Supabase | in-memory) · llm · auth · bootstrap · tasks
│       ├── integrations/  brightdata · cognee · livekit · speechmatics · trigger
│       ├── services/      research · signals · scoring · memory · personalization · outreach ·
│       │                  sequences · voice · copilot · coaching · prospecting · workflows · dashboard
│       └── api/routes/     dashboard · accounts · signals · prospecting · sequences · outreach ·
│                           calls · voice (WS) · coaching · workflows · settings
├── frontend/          # Next.js (App Router) — "The Revenue Almanac" editorial UI
│   └── src/{app,components,lib,styles}
├── trigger/           # Trigger.dev v3 workflows (TypeScript)
├── supabase/          # schema migrations + seed + DB docs
└── docs/              # architecture · sponsors · demo
```

---

## 12. The 90-second demo

1. **Dashboard** — hot accounts, fresh signals, today's priorities, live signal ticker.
2. **Research** a company (type `Cursor`) — Bright Data gathers web data, Claude extracts signals, the account is scored, Cognee stores it.
3. **Account page** — fit/intent/timing/risk scores, a "why now" callout, and tabs for Signals, People, Outreach, Calls, Timeline, Risk. Hit **Ask memory** for Cognee's graph-grounded answer.
4. **Sequence** — generate a multi-day cadence; **Launch** dispatches the Trigger.dev workflow.
5. **Prospect** by ICP — _"Series A AI infra startups hiring sales engineers"_ → ranked accounts with openers.
6. **Dialer** — LiveKit room opens, Speechmatics transcribes live; when the prospect says _"too expensive"_ the copilot fires an ROI battlecard.
7. **End call** — Claude writes a summary + scorecard, a follow-up draft, and updates memory.
8. **Coaching** — scorecard breakdown, transcript, rep leaderboard, AI roleplay.

Full script: [`docs/DEMO.md`](docs/DEMO.md).

---

## 13. Tech stack & further docs

| Layer | Tech |
| --- | --- |
| Frontend | Next.js (App Router), React 19, Tailwind v4, Framer Motion |
| Backend | Python FastAPI (async), Pydantic, asyncpg |
| Workflows | Trigger.dev v3 (TypeScript) |
| Database / Auth | Supabase Postgres (RLS) + Supabase Auth |
| Memory | Cognee (native knowledge graph + fastembed) |
| Web data | Bright Data (SERP + Web Unlocker) |
| Voice | LiveKit (transport) + Speechmatics (STT) |
| LLM | Claude — Opus / Sonnet / Haiku, tiered |

**More docs:** [Architecture](docs/ARCHITECTURE.md) · [Sponsor usage](docs/SPONSORS.md) · [Demo script](docs/DEMO.md) · [Workflows](trigger/README.md) · [Database](supabase/README.md)
