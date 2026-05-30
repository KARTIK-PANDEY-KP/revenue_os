# Architecture

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | Next.js 15 (App Router), React 19, Tailwind v4, Framer Motion |
| Backend | Python FastAPI (async), Pydantic |
| Workflows | Trigger.dev v3 (TypeScript) |
| Database | Supabase Postgres (RLS) + Supabase Auth |
| Memory | Cognee (knowledge graph) |
| Web data | Bright Data |
| Voice | LiveKit (transport) + Speechmatics (STT) |
| LLM | Claude (Opus / Sonnet / Haiku, tiered) |

## Request flow

The browser calls the backend through a Next rewrite (`/backend/* → FastAPI`) to stay
same-origin in dev; the dialer uses a direct WebSocket to the backend for live
transcript + copilot streaming. Auth is a Supabase JWT (Bearer) when configured;
otherwise a demo context applies so the API is always usable.

## Backend layout

```
backend/app/
├── core/            config, logging, db (Supabase | in-memory), llm (Claude), auth, seed
├── integrations/    brightdata, cognee, livekit, speechmatics, trigger (+ mocks)
├── services/        research, signal_extraction, scoring, memory, personalization,
│                    outreach, sequences, voice, copilot, coaching, prospecting,
│                    workflows, dashboard
└── api/routes/      dashboard, accounts, signals, prospecting, sequences, outreach,
                     calls, voice, coaching, workflows, settings
```

### Key design decisions

- **Mock-first.** Each integration exposes `enabled`; when off, a domain mock returns
  realistic data. `REVENUEOS_FORCE_MOCK=true` forces mocks even with keys (offline demos).
- **One DB interface, two backends.** `core/db.py` provides a postgrest-style chainable
  API. `SupabaseRepo` wraps supabase-py; `MemoryRepo` is an in-memory store seeded with
  the demo dataset. Services never know which is active.
- **Scoring formula.** `overall = 0.30·fit + 0.30·intent + 0.25·timing + 0.10·engagement
  − 0.05·risk` — encoded both in `services/scoring.py` and `compute_overall_score()` in SQL.
  Signals are weighted by type, confidence, impact, and recency decay.
- **Provenance.** Signals link to `sources` (the Bright Data capture) for traceable claims.
- **Workflows call back.** Trigger.dev tasks invoke the backend API, so business logic is
  single-sourced and runs identically inline (mock) or orchestrated (live).

## Data model

Multi-tenant: a `team` owns all GTM data; users join via `team_members`; every table is
RLS-isolated by `is_team_member(team_id)`. Core tables: `accounts`, `contacts`,
`competitors`, `sources`, `signals`, `account_scores`, `risk_flags`, `playbooks`,
`sequences`, `sequence_steps`, `outreach_messages`, `calls`, `call_transcripts`,
`call_scorecards`, `workflows`, `tasks`. See `supabase/migrations`.

## Frontend layout

```
frontend/src/
├── app/(app)/       dashboard, accounts/[id], prospecting, signals, sequences/[id],
│                    dialer, calls, coaching, settings  (+ login, root redirect)
├── components/      AppShell (sidebar + masthead ticker), Providers (auth), ui kit
├── lib/             api client, supabase, formatting helpers
└── styles/          globals.css — "The Revenue Almanac" design system
```

Design system: warm ivory paper, near-black ink, single vermilion accent, hairline
ledger rules, oversized Fraunces serif numerals (scores), Hanken Grotesk UI, Spline Sans
Mono for data. The dialer inverts to a dark "focus room." Staggered page-load reveals,
grain texture, a live signal ticker.
