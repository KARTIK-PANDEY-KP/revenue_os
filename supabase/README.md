# RevenueOS — Database (Supabase / Postgres)

This folder holds the **complete schema as ordered migrations** plus demo seed
data. Nothing here touches any existing database — it's inert until you point it
at a Supabase project.

## What's here

```
migrations/
  0001_extensions_and_core.sql      extensions, profiles, teams, team_members, RLS helpers
  0002_accounts_contacts.sql        accounts, contacts, competitors
  0003_signals_sources_scores.sql   sources, signals, account_scores, risk_flags
  0004_sequences_outreach.sql       playbooks, sequences, sequence_steps, outreach_messages
  0005_calls_coaching.sql           calls, call_transcripts, call_scorecards
  0006_workflows_tasks.sql          workflows, tasks
  0007_functions_triggers_views.sql updated_at triggers, new-user hook, scoring fn, dashboard views
  0008_rls_policies.sql             Row Level Security for every table (team-isolated)
seed/
  demo_seed.sql                     demo team + sample accounts/signals/sequence/tasks
```

## Apply the schema (once you have a Supabase project)

**Option A — Supabase CLI (recommended)**

```bash
# 1. Link the project (uses SUPABASE_PROJECT_REF + your access token)
supabase link --project-ref <your-project-ref>

# 2. Push every migration in order
supabase db push

# 3. (optional) load demo data
psql "$DATABASE_URL" -f supabase/seed/demo_seed.sql
```

**Option B — plain psql** (any Postgres connection string works)

```bash
for f in supabase/migrations/*.sql; do psql "$DATABASE_URL" -f "$f"; done
psql "$DATABASE_URL" -f supabase/seed/demo_seed.sql
```

The repo also ships a convenience target: `make db-migrate` and `make db-seed`
(see the root `Makefile`).

## Design notes

- **Multi-tenant:** a `team` is the tenant boundary. Users join via `team_members`.
  Every GTM table carries `team_id` and is isolated by RLS through
  `public.is_team_member(team_id)`.
- **Auth:** `profiles` is 1:1 with `auth.users`. A trigger auto-creates a profile
  on signup. The **backend** uses the service-role key and bypasses RLS; the
  **frontend** uses the authenticated role and is fully governed by RLS.
- **Scores:** `accounts` carries denormalized latest scores for fast lists;
  `account_scores` keeps the history. `compute_overall_score()` encodes the
  weighting `0.30·fit + 0.30·intent + 0.25·timing + 0.10·engagement − 0.05·risk`.
- **Provenance:** every signal links to a `source` (the Bright Data capture) so
  the UI can always show *where a claim came from*.
