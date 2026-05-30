-- ============================================================================
-- RevenueOS — 0001 Extensions & core tenancy
-- Multi-tenant model: a `team` owns all GTM data. Users join teams via
-- `team_members`. Row Level Security (added in 0007) keys every policy off
-- team membership so data is isolated per team.
-- ============================================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "pg_trgm";        -- fuzzy text search on company names
create extension if not exists "vector";         -- embeddings (optional, mirrors Cognee)

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
do $$ begin
  create type team_role as enum ('owner', 'admin', 'member');
exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- profiles — 1:1 with auth.users (Supabase Auth)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text unique not null,
  full_name   text,
  avatar_url  text,
  title       text,                       -- e.g. "Account Executive"
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- teams — the tenant boundary
-- ----------------------------------------------------------------------------
create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  -- ICP definition used by scoring + prospecting (free-form JSON)
  icp         jsonb not null default '{}'::jsonb,
  -- Default outbound config (tone, channels, signature)
  settings    jsonb not null default '{}'::jsonb,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- team_members — membership + role
-- ----------------------------------------------------------------------------
create table if not exists public.team_members (
  team_id     uuid not null references public.teams (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  role        team_role not null default 'member',
  created_at  timestamptz not null default now(),
  primary key (team_id, user_id)
);

create index if not exists idx_team_members_user on public.team_members (user_id);

-- ----------------------------------------------------------------------------
-- Helper: is the current auth user a member of a given team?
-- Used throughout RLS policies. SECURITY DEFINER to avoid recursive RLS.
-- ----------------------------------------------------------------------------
create or replace function public.is_team_member(target_team uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.team_members tm
    where tm.team_id = target_team
      and tm.user_id = auth.uid()
  );
$$;

-- Convenience: every team the current user belongs to.
create or replace function public.my_team_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select team_id from public.team_members where user_id = auth.uid();
$$;
