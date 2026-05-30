-- ============================================================================
-- RevenueOS — 0009 App-level email/password auth
-- A self-contained user store for the simple email/password login gate. This is
-- SEPARATE from Supabase Auth (auth.users) and the team data model: it only
-- provides identity for the login gate. All data operations continue to run
-- against the demo user/team; app_users.id is NEVER used as a FK target.
-- ============================================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid()

create table if not exists public.app_users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  password_hash text not null,
  full_name     text,
  company       text,
  created_at    timestamptz default now()
);

-- Case-insensitive uniqueness on email (login lowercases before lookup).
create unique index if not exists app_users_lower_email_idx
  on public.app_users (lower(email));
