-- ============================================================================
-- RevenueOS — 0004 Playbooks, sequences, steps, outreach messages
-- ============================================================================

do $$ begin
  create type channel as enum ('email', 'call', 'linkedin', 'sms', 'task');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sequence_status as enum ('draft', 'pending_approval', 'active', 'paused', 'completed', 'stopped');
exception when duplicate_object then null; end $$;

do $$ begin
  create type step_status as enum ('pending', 'scheduled', 'waiting', 'sent', 'skipped', 'replied', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type approval_mode as enum ('manual', 'auto', 'auto_high_confidence');
exception when duplicate_object then null; end $$;

do $$ begin
  create type message_status as enum ('draft', 'approved', 'queued', 'sent', 'bounced', 'replied', 'failed');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- playbooks — reusable rep playbooks (best-rep patterns Cognee can learn from)
-- ----------------------------------------------------------------------------
create table if not exists public.playbooks (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams (id) on delete cascade,
  name          text not null,
  persona       text,                        -- target persona this playbook fits
  objective     text,
  tone          text default 'consultative',
  -- step templates, talk tracks, objection responses
  content       jsonb not null default '{}'::jsonb,
  -- learned win rate / usage stats
  stats         jsonb not null default '{}'::jsonb,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_playbooks_team on public.playbooks (team_id);

-- ----------------------------------------------------------------------------
-- sequences — an outbound sequence targeting an account/persona
-- ----------------------------------------------------------------------------
create table if not exists public.sequences (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams (id) on delete cascade,
  account_id    uuid references public.accounts (id) on delete cascade,
  contact_id    uuid references public.contacts (id) on delete set null,
  owner_id      uuid references public.profiles (id) on delete set null,
  playbook_id   uuid references public.playbooks (id) on delete set null,

  name          text not null,
  persona       text,
  objective     text,
  tone          text default 'consultative',
  channels      channel[] not null default array['email','call','linkedin']::channel[],
  approval_mode approval_mode not null default 'manual',
  status        sequence_status not null default 'draft',

  -- Trigger.dev run handle for the orchestrating workflow
  trigger_run_id text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  started_at    timestamptz,
  completed_at  timestamptz
);

create index if not exists idx_sequences_team on public.sequences (team_id, status);
create index if not exists idx_sequences_account on public.sequences (account_id);

-- ----------------------------------------------------------------------------
-- sequence_steps — ordered steps within a sequence
-- ----------------------------------------------------------------------------
create table if not exists public.sequence_steps (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams (id) on delete cascade,
  sequence_id   uuid not null references public.sequences (id) on delete cascade,

  step_order    integer not null,            -- 1-based
  channel       channel not null,
  day_offset    integer not null default 0,  -- days after sequence start
  -- AI guidance for this step ("Mention recent enterprise hiring")
  instruction   text,
  -- Generated content for this step (subject/body/script)
  content       jsonb not null default '{}'::jsonb,
  status        step_status not null default 'pending',

  scheduled_at  timestamptz,
  executed_at   timestamptz,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (sequence_id, step_order)
);

create index if not exists idx_steps_sequence on public.sequence_steps (sequence_id, step_order);

-- ----------------------------------------------------------------------------
-- outreach_messages — concrete generated messages (email/linkedin/voicemail)
-- ----------------------------------------------------------------------------
create table if not exists public.outreach_messages (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams (id) on delete cascade,
  account_id    uuid references public.accounts (id) on delete cascade,
  contact_id    uuid references public.contacts (id) on delete set null,
  sequence_id   uuid references public.sequences (id) on delete cascade,
  step_id       uuid references public.sequence_steps (id) on delete cascade,

  channel       channel not null default 'email',
  subject       text,
  body          text not null,
  -- which signals/memory grounded this message (for "why this message")
  grounding     jsonb not null default '{}'::jsonb,
  status        message_status not null default 'draft',

  scheduled_at  timestamptz,
  sent_at       timestamptz,
  replied_at    timestamptz,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_messages_team on public.outreach_messages (team_id, status);
create index if not exists idx_messages_account on public.outreach_messages (account_id);
create index if not exists idx_messages_sequence on public.outreach_messages (sequence_id);
