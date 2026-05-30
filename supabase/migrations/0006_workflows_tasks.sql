-- ============================================================================
-- RevenueOS — 0006 Workflows & tasks (Trigger.dev orchestration mirror)
-- These tables mirror Trigger.dev runs into Postgres so the UI can display
-- background work, recommended actions, and a rep task queue.
-- ============================================================================

do $$ begin
  create type workflow_kind as enum (
    'daily_monitor', 'signal_detected', 'sequence_run', 'call_completed', 'research', 'custom'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type run_status as enum ('queued', 'running', 'waiting', 'completed', 'failed', 'canceled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_kind as enum ('call', 'email', 'linkedin', 'research', 'review', 'followup', 'approval');
exception when duplicate_object then null; end $$;

do $$ begin
  create type task_status as enum ('open', 'in_progress', 'done', 'snoozed', 'dismissed');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- workflows — a record of a Trigger.dev run (mirrored for observability)
-- ----------------------------------------------------------------------------
create table if not exists public.workflows (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams (id) on delete cascade,
  account_id    uuid references public.accounts (id) on delete cascade,

  kind          workflow_kind not null,
  status        run_status not null default 'queued',
  trigger_run_id text,                       -- Trigger.dev run handle
  trigger_task  text,                        -- task identifier in /trigger
  payload       jsonb not null default '{}'::jsonb,
  result        jsonb not null default '{}'::jsonb,
  error         text,

  started_at    timestamptz,
  finished_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_workflows_team on public.workflows (team_id, created_at desc);
create index if not exists idx_workflows_status on public.workflows (team_id, status);
create index if not exists idx_workflows_account on public.workflows (account_id);

-- ----------------------------------------------------------------------------
-- tasks — the rep's actionable queue (recommended actions / next steps)
-- ----------------------------------------------------------------------------
create table if not exists public.tasks (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams (id) on delete cascade,
  account_id    uuid references public.accounts (id) on delete cascade,
  contact_id    uuid references public.contacts (id) on delete set null,
  assignee_id   uuid references public.profiles (id) on delete set null,
  signal_id     uuid references public.signals (id) on delete set null,
  sequence_id   uuid references public.sequences (id) on delete set null,
  call_id       uuid references public.calls (id) on delete set null,

  kind          task_kind not null default 'followup',
  status        task_status not null default 'open',
  priority      integer not null default 3,   -- 1 (highest) .. 5
  title         text not null,
  detail        text,
  due_at        timestamptz,

  -- provenance: which workflow/signal generated this
  created_by_workflow uuid references public.workflows (id) on delete set null,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  completed_at  timestamptz
);

create index if not exists idx_tasks_team on public.tasks (team_id, status, priority);
create index if not exists idx_tasks_assignee on public.tasks (assignee_id, status);
create index if not exists idx_tasks_account on public.tasks (account_id);
