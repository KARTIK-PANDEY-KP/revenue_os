-- ============================================================================
-- RevenueOS — 0003 Sources, signals, account scores, risk flags
-- ============================================================================

do $$ begin
  create type signal_type as enum (
    'hiring', 'funding', 'pricing', 'product', 'executive',
    'expansion', 'competitor', 'partnership', 'techstack',
    'complaint', 'event', 'news',
    -- finance / market
    'headcount', 'layoff', 'revenue_proxy', 'investor',
    -- security / compliance
    'breach', 'compliance', 'trust_center', 'risk'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type signal_status as enum ('new', 'reviewed', 'actioned', 'dismissed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type source_kind as enum (
    'website', 'pricing', 'blog', 'changelog', 'careers',
    'linkedin', 'news', 'review', 'forum', 'producthunt',
    'github', 'crunchbase', 'serp', 'other'
  );
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- sources — raw web sources captured by Bright Data (provenance)
-- ----------------------------------------------------------------------------
create table if not exists public.sources (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams (id) on delete cascade,
  account_id    uuid references public.accounts (id) on delete cascade,
  kind          source_kind not null default 'other',
  url           text not null,
  title         text,
  -- Extracted/cleaned content snapshot used for signal extraction
  content       text,
  raw           jsonb not null default '{}'::jsonb,
  -- Which Bright Data job produced it
  collector     text,                       -- e.g. 'web_mcp.search', 'scraper.careers'
  fetched_at    timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create index if not exists idx_sources_account on public.sources (account_id);
create index if not exists idx_sources_team on public.sources (team_id);
create index if not exists idx_sources_kind on public.sources (account_id, kind);

-- ----------------------------------------------------------------------------
-- signals — normalized GTM/finance/security signals
-- ----------------------------------------------------------------------------
create table if not exists public.signals (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams (id) on delete cascade,
  account_id    uuid not null references public.accounts (id) on delete cascade,
  source_id     uuid references public.sources (id) on delete set null,

  type          signal_type not null,
  title         text not null,
  summary       text not null,
  source_url    text,

  confidence    numeric(5,2) not null default 50,   -- 0..100
  impact_score  numeric(5,2) not null default 50,   -- 0..100
  recommended_action text,
  status        signal_status not null default 'new',

  -- dedupe key (type + normalized title) to avoid duplicate signals
  dedupe_hash   text,

  detected_at   timestamptz not null default now(),
  created_at    timestamptz not null default now(),

  unique (account_id, dedupe_hash)
);

create index if not exists idx_signals_account on public.signals (account_id, detected_at desc);
create index if not exists idx_signals_team on public.signals (team_id, detected_at desc);
create index if not exists idx_signals_type on public.signals (team_id, type);
create index if not exists idx_signals_status on public.signals (team_id, status);

-- Backfill the deferred FK from competitors.mentioned_in_signal
do $$ begin
  alter table public.competitors
    add constraint fk_competitor_signal
    foreign key (mentioned_in_signal) references public.signals (id) on delete set null;
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- account_scores — score history (re-scored by workflows over time)
-- ----------------------------------------------------------------------------
create table if not exists public.account_scores (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams (id) on delete cascade,
  account_id    uuid not null references public.accounts (id) on delete cascade,

  overall_score   numeric(5,2) not null,
  fit_score       numeric(5,2) not null,
  intent_score    numeric(5,2) not null,
  timing_score    numeric(5,2) not null,
  engagement_score numeric(5,2) not null default 0,
  risk_penalty    numeric(5,2) not null default 0,

  -- explanation of the score: which signals drove it
  rationale     jsonb not null default '{}'::jsonb,
  scored_at     timestamptz not null default now()
);

create index if not exists idx_scores_account on public.account_scores (account_id, scored_at desc);

-- ----------------------------------------------------------------------------
-- risk_flags — security/compliance/vendor risk surfaced for an account
-- ----------------------------------------------------------------------------
create table if not exists public.risk_flags (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams (id) on delete cascade,
  account_id    uuid not null references public.accounts (id) on delete cascade,
  signal_id     uuid references public.signals (id) on delete set null,

  category      text not null,               -- 'breach' | 'compliance' | 'vendor_risk' | ...
  severity      text not null default 'low', -- 'low' | 'medium' | 'high' | 'critical'
  title         text not null,
  detail        text,
  source_url    text,
  resolved      boolean not null default false,
  detected_at   timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

create index if not exists idx_risk_account on public.risk_flags (account_id);
create index if not exists idx_risk_team on public.risk_flags (team_id, severity);
