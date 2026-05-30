# Sponsor usage map

Each sponsor has a load-bearing role. RevenueOS does not function as designed
without them — the mocks exist only so the product is demoable before keys land.

## Bright Data — the data engine

The center of the product. Everything starts with live web data.

- **Code:** `backend/app/integrations/brightdata.py`
- **Used by:** `AccountResearchService`, `SignalExtractionService`, `ProspectingService`
- **Surface:** Web Unlocker + SERP API (the `/request` endpoint) and Web MCP search/extract
- **Named jobs** (mirroring the brief): `research_company`, `extract_careers_page`,
  `monitor_pricing_page`, `find_recent_news`, `find_decision_makers`,
  `extract_buying_signals`, `find_similar_companies`
- **Powers:** company research, hiring/funding/pricing/competitor monitoring,
  decision-maker discovery, and all buying-signal evidence.
- **Provenance:** every captured page is stored in the `sources` table and linked
  to the signal it produced, so the UI can always show *where a claim came from*.

## Cognee — memory + knowledge graph

Persistent memory so agents reason over history instead of starting cold.

- **Code:** `backend/app/integrations/cognee_client.py`, `backend/app/services/memory.py`
- **Resolution:** native SDK → REST API (cloud or self-hosted) → in-memory graph
- **Stores:** Company, Person, Signal, Email, Call, Sequence, Rep, Objection,
  Competitor, Product, FundingEvent, JobPosting, RiskFlag — with typed edges
  (`Company HAS_SIGNAL Signal`, `Person WORKS_AT Company`, …)
- **Powers:** the account "Ask memory / why now?" answer, personalization grounding,
  and learning from past successful outreach.

## Trigger.dev — workflow engine

Durable, long-running orchestration.

- **Code:** `trigger/src/trigger/*.ts`; dispatched from `backend/app/services/workflows.py`
- **Workflows:**
  1. `daily-monitor` — scheduled (`0 8 * * *`): research watched accounts → new
     signals → re-score → fan out per signal
  2. `signal-detected` — classify → recommend → draft outreach / create call task
  3. `sequence-run` — multi-day cadence with real `wait.for` between steps + branching
  4. `call-completed` — transcribe → summarize → scorecard → follow-up → next task
- **Pattern:** tasks call back into the FastAPI API, so logic lives in one place and
  runs identically inline (mock) or via Trigger.dev (live), with retries + observability.

## LiveKit — real-time voice

Browser-based calling infrastructure.

- **Code:** `backend/app/integrations/livekit_client.py`, dialer in `frontend/.../dialer`
- **Used for:** call rooms, AI-SDR audio sessions, real-time audio transport
- **Backend** mints short-lived room access tokens; the browser joins the room.

## Speechmatics — real-time transcription

Turns call audio into text + intelligence.

- **Code:** `backend/app/integrations/speechmatics_client.py`, WS in `app/api/routes/voice.py`
- **Used for:** live call transcription, the SDR copilot trigger stream, summaries,
  objection detection, and coaching scorecards
- **Security:** backend mints a short-lived JWT so the API key never reaches the client;
  the browser streams mic audio straight to the Speechmatics real-time WebSocket.
- **Mock:** a scripted sales call (with the "too expensive" / "we use Apollo" objections)
  drives the dialer so the copilot + coaching demo runs with no audio hardware.

## Claude (Anthropic) — reasoning layer

- **Code:** `backend/app/core/llm.py` (tiered: Opus / Sonnet / Haiku by task)
- **Used for:** research synthesis, signal extraction (structured tool output),
  personalization, sequence planning, scorecards, roleplay, and the live copilot.

## Supabase — data + auth

- **Code:** schema in `supabase/migrations`, client in `backend/app/core/db.py`
- **Used for:** Postgres persistence (RLS-isolated per team) + Supabase Auth.
- Provisioned via migration files; the backend uses the service role and the
  frontend the authenticated role.
