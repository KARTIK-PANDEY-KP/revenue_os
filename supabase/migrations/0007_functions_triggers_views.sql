-- ============================================================================
-- RevenueOS — 0007 Triggers, helper functions, dashboard views
-- ============================================================================

-- ----------------------------------------------------------------------------
-- updated_at auto-touch
-- ----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','teams','accounts','contacts','playbooks','sequences',
    'sequence_steps','outreach_messages','calls','workflows','tasks'
  ] loop
    execute format(
      'drop trigger if exists trg_touch_%1$s on public.%1$s;
       create trigger trg_touch_%1$s before update on public.%1$s
       for each row execute function public.touch_updated_at();', t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- Auto-create a profile when a new auth user signs up
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- apply_score(account, weights...) — recompute denormalized account scores
-- overall = 0.30*fit + 0.30*intent + 0.25*timing + 0.10*engagement - 0.05*risk
-- ----------------------------------------------------------------------------
create or replace function public.compute_overall_score(
  fit numeric, intent numeric, timing numeric, engagement numeric, risk numeric
) returns numeric language sql immutable as $$
  select round(
    0.30 * coalesce(fit,0)
  + 0.30 * coalesce(intent,0)
  + 0.25 * coalesce(timing,0)
  + 0.10 * coalesce(engagement,0)
  - 0.05 * coalesce(risk,0)
  , 2);
$$;

-- ----------------------------------------------------------------------------
-- Dashboard aggregate: one row per team with headline counts.
-- Security: this is a view; RLS on underlying tables still applies.
-- ----------------------------------------------------------------------------
create or replace view public.dashboard_stats
with (security_invoker = true) as
select
  t.id as team_id,
  (select count(*) from public.accounts a
     where a.team_id = t.id and a.overall_score >= 80) as hot_accounts,
  (select count(*) from public.signals s
     where s.team_id = t.id and s.detected_at > now() - interval '24 hours') as new_signals_24h,
  (select count(*) from public.outreach_messages m
     where m.team_id = t.id and m.status = 'draft') as outreach_ready,
  (select count(*) from public.calls c
     where c.team_id = t.id and c.status = 'scheduled') as calls_scheduled,
  (select count(*) from public.accounts a
     where a.team_id = t.id and a.stage = 'opportunity') as pipeline_opportunities,
  (select count(distinct r.account_id) from public.risk_flags r
     where r.team_id = t.id and r.resolved = false) as accounts_with_risk
from public.teams t;

-- Leaderboard view: ranked accounts with their freshest signal.
create or replace view public.account_leaderboard
with (security_invoker = true) as
select
  a.id,
  a.team_id,
  a.name,
  a.domain,
  a.logo_url,
  a.overall_score,
  a.fit_score,
  a.intent_score,
  a.timing_score,
  a.stage,
  a.why_now,
  a.recommended_action,
  a.owner_id,
  p.full_name as owner_name,
  (select s.title from public.signals s
     where s.account_id = a.id order by s.detected_at desc limit 1) as latest_signal,
  (select s.type from public.signals s
     where s.account_id = a.id order by s.detected_at desc limit 1) as latest_signal_type,
  rank() over (partition by a.team_id order by a.overall_score desc) as rank
from public.accounts a
left join public.profiles p on p.id = a.owner_id;
