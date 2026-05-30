-- ============================================================================
-- RevenueOS — 0002 Accounts, contacts, competitors
-- ============================================================================

do $$ begin
  create type account_stage as enum (
    'new', 'researching', 'qualified', 'engaged', 'opportunity', 'won', 'lost', 'archived'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type seniority as enum (
    'c_level', 'vp', 'director', 'manager', 'ic', 'unknown'
  );
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- accounts — the company record (built by AccountResearchService)
-- ----------------------------------------------------------------------------
create table if not exists public.accounts (
  id              uuid primary key default gen_random_uuid(),
  team_id         uuid not null references public.teams (id) on delete cascade,
  owner_id        uuid references public.profiles (id) on delete set null,

  name            text not null,
  domain          text,                    -- canonical domain, e.g. cursor.com
  website         text,
  logo_url        text,
  industry        text,
  description     text,                     -- AI summary
  employee_estimate integer,
  hq_location     text,
  founded_year    integer,

  stage           account_stage not null default 'new',

  -- Denormalized latest scores for fast list/leaderboard rendering.
  -- Source of truth for score history lives in account_scores.
  overall_score   numeric(5,2) default 0,
  fit_score       numeric(5,2) default 0,
  intent_score    numeric(5,2) default 0,
  timing_score    numeric(5,2) default 0,
  engagement_score numeric(5,2) default 0,
  risk_penalty    numeric(5,2) default 0,

  -- "Why now?" one-liner surfaced on dashboards/leaderboards
  why_now         text,
  recommended_action text,

  -- Structured research payload (products, news, hiring trends, funding…)
  research        jsonb not null default '{}'::jsonb,
  -- Cognee node id for the company memory graph
  memory_node_id  text,

  last_researched_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  unique (team_id, domain)
);

create index if not exists idx_accounts_team on public.accounts (team_id);
create index if not exists idx_accounts_owner on public.accounts (owner_id);
create index if not exists idx_accounts_score on public.accounts (team_id, overall_score desc);
create index if not exists idx_accounts_stage on public.accounts (team_id, stage);
create index if not exists idx_accounts_name_trgm on public.accounts using gin (name gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- contacts — people at accounts (decision makers etc.)
-- ----------------------------------------------------------------------------
create table if not exists public.contacts (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams (id) on delete cascade,
  account_id    uuid not null references public.accounts (id) on delete cascade,

  full_name     text not null,
  title         text,
  seniority     seniority not null default 'unknown',
  department    text,
  email         text,
  phone         text,
  linkedin_url  text,
  location      text,

  -- Is this a recommended buyer / decision maker for our motion?
  is_decision_maker boolean not null default false,
  -- AI-suggested opener for this specific person
  suggested_opener  text,
  confidence    numeric(5,2) default 0,

  enrichment    jsonb not null default '{}'::jsonb,
  memory_node_id text,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_contacts_account on public.contacts (account_id);
create index if not exists idx_contacts_team on public.contacts (team_id);

-- ----------------------------------------------------------------------------
-- competitors — companies we displace / get compared against
-- ----------------------------------------------------------------------------
create table if not exists public.competitors (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams (id) on delete cascade,
  account_id    uuid references public.accounts (id) on delete cascade,
  name          text not null,
  domain        text,
  -- battlecard: how we differentiate vs this competitor
  battlecard    jsonb not null default '{}'::jsonb,
  mentioned_in_signal uuid,        -- FK added in 0003 after signals exists
  created_at    timestamptz not null default now()
);

create index if not exists idx_competitors_team on public.competitors (team_id);
create index if not exists idx_competitors_account on public.competitors (account_id);
