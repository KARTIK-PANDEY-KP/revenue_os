-- ============================================================================
-- RevenueOS — 0008 Row Level Security
-- The backend uses the service_role key (bypasses RLS). The frontend uses the
-- authenticated role and is fully governed by these policies. Every GTM table
-- is isolated by team membership via public.is_team_member(team_id).
-- ============================================================================

-- ---- profiles -------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists profiles_select_self_or_teammate on public.profiles;
create policy profiles_select_self_or_teammate on public.profiles
  for select using (
    id = auth.uid()
    or exists (
      select 1 from public.team_members me
      join public.team_members them on them.team_id = me.team_id
      where me.user_id = auth.uid() and them.user_id = public.profiles.id
    )
  );

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert with check (id = auth.uid());

-- ---- teams ----------------------------------------------------------------
alter table public.teams enable row level security;

drop policy if exists teams_select_member on public.teams;
create policy teams_select_member on public.teams
  for select using (public.is_team_member(id));

drop policy if exists teams_insert_any on public.teams;
create policy teams_insert_any on public.teams
  for insert with check (created_by = auth.uid());

drop policy if exists teams_update_admin on public.teams;
create policy teams_update_admin on public.teams
  for update using (
    exists (select 1 from public.team_members tm
      where tm.team_id = id and tm.user_id = auth.uid()
        and tm.role in ('owner','admin'))
  );

-- ---- team_members ---------------------------------------------------------
alter table public.team_members enable row level security;

drop policy if exists team_members_select on public.team_members;
create policy team_members_select on public.team_members
  for select using (public.is_team_member(team_id));

drop policy if exists team_members_insert_admin on public.team_members;
create policy team_members_insert_admin on public.team_members
  for insert with check (
    -- the creator adding themselves to a team they just made, or an admin adding others
    user_id = auth.uid()
    or exists (select 1 from public.team_members tm
      where tm.team_id = team_members.team_id and tm.user_id = auth.uid()
        and tm.role in ('owner','admin'))
  );

drop policy if exists team_members_delete_admin on public.team_members;
create policy team_members_delete_admin on public.team_members
  for delete using (
    user_id = auth.uid()
    or exists (select 1 from public.team_members tm
      where tm.team_id = team_members.team_id and tm.user_id = auth.uid()
        and tm.role in ('owner','admin'))
  );

-- ---- Standard team-scoped tables -----------------------------------------
-- Apply identical "member can do everything within their team" policies.
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'accounts','contacts','competitors','sources','signals','account_scores',
    'risk_flags','playbooks','sequences','sequence_steps','outreach_messages',
    'calls','call_transcripts','call_scorecards','workflows','tasks'
  ] loop
    execute format('alter table public.%I enable row level security;', tbl);

    execute format('drop policy if exists %1$s_team_all on public.%1$s;', tbl);
    execute format(
      'create policy %1$s_team_all on public.%1$s
         for all
         using (public.is_team_member(team_id))
         with check (public.is_team_member(team_id));', tbl);
  end loop;
end $$;
