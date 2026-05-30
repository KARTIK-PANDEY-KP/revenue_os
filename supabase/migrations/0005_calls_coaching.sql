-- ============================================================================
-- RevenueOS — 0005 Calls, transcripts, scorecards (LiveKit + Speechmatics + coaching)
-- ============================================================================

do $$ begin
  create type call_status as enum ('scheduled', 'ringing', 'live', 'completed', 'missed', 'failed', 'voicemail');
exception when duplicate_object then null; end $$;

do $$ begin
  create type call_disposition as enum (
    'connected', 'no_answer', 'voicemail', 'gatekeeper',
    'not_interested', 'callback', 'meeting_booked', 'wrong_number', 'dnc'
  );
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- calls — a dialer/LiveKit call session
-- ----------------------------------------------------------------------------
create table if not exists public.calls (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams (id) on delete cascade,
  account_id    uuid references public.accounts (id) on delete cascade,
  contact_id    uuid references public.contacts (id) on delete set null,
  rep_id        uuid references public.profiles (id) on delete set null,
  sequence_id   uuid references public.sequences (id) on delete set null,

  status        call_status not null default 'scheduled',
  disposition   call_disposition,
  direction     text not null default 'outbound',  -- 'outbound' | 'inbound'

  -- LiveKit room + recording metadata
  livekit_room  text,
  recording_url text,
  duration_secs integer default 0,

  -- AI prep surfaced on the dialer (opener, talking points, objections)
  prep          jsonb not null default '{}'::jsonb,
  -- Post-call AI summary
  summary       text,
  -- follow-up action created after the call
  followup      jsonb not null default '{}'::jsonb,
  notes         text,

  scheduled_at  timestamptz,
  started_at    timestamptz,
  ended_at      timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_calls_team on public.calls (team_id, created_at desc);
create index if not exists idx_calls_account on public.calls (account_id);
create index if not exists idx_calls_rep on public.calls (rep_id);
create index if not exists idx_calls_status on public.calls (team_id, status);

-- ----------------------------------------------------------------------------
-- call_transcripts — Speechmatics real-time transcript segments
-- One row per finalized utterance/segment for replay + coaching analysis.
-- ----------------------------------------------------------------------------
create table if not exists public.call_transcripts (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams (id) on delete cascade,
  call_id       uuid not null references public.calls (id) on delete cascade,

  speaker       text not null default 'unknown', -- 'rep' | 'prospect' | 'S1' | 'S2'
  start_ms      integer not null default 0,
  end_ms        integer not null default 0,
  text          text not null,
  is_final      boolean not null default true,
  language      text default 'en',
  -- copilot suggestion emitted in response to this segment (if any)
  copilot       jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists idx_transcripts_call on public.call_transcripts (call_id, start_ms);

-- ----------------------------------------------------------------------------
-- call_scorecards — coaching scorecard per call
-- ----------------------------------------------------------------------------
create table if not exists public.call_scorecards (
  id                       uuid primary key default gen_random_uuid(),
  team_id                  uuid not null references public.teams (id) on delete cascade,
  call_id                  uuid not null references public.calls (id) on delete cascade,
  rep_id                   uuid references public.profiles (id) on delete set null,

  discovery_score          numeric(5,2) not null default 0,
  objection_handling_score numeric(5,2) not null default 0,
  personalization_score    numeric(5,2) not null default 0,
  next_step_score          numeric(5,2) not null default 0,
  qualification_score      numeric(5,2) not null default 0,
  talk_ratio               numeric(5,2) not null default 0, -- rep talk %
  overall_score            numeric(5,2) not null default 0,

  summary                  text,
  improvements             jsonb not null default '[]'::jsonb,
  objections_detected      jsonb not null default '[]'::jsonb,

  created_at               timestamptz not null default now(),
  unique (call_id)
);

create index if not exists idx_scorecards_team on public.call_scorecards (team_id);
create index if not exists idx_scorecards_rep on public.call_scorecards (rep_id);
