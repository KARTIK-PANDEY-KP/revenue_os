-- ============================================================================
-- RevenueOS — Demo seed data
-- Loads a demo team with sample accounts, contacts, signals, scores, a sequence
-- and a couple of tasks so the product is alive on first boot. Idempotent.
--
-- Run with the SERVICE ROLE (bypasses RLS):
--   psql "$DATABASE_URL" -f supabase/seed/demo_seed.sql
-- The backend also runs this automatically when REVENUEOS_LOAD_DEMO_DATA=true.
--
-- The demo team uses a fixed UUID so the backend/frontend can reference it.
-- Real users are attached to this team on first login by the backend.
-- ============================================================================

\set demo_team '00000000-0000-0000-0000-0000000000aa'

insert into public.teams (id, name, slug, icp, settings)
values (
  '00000000-0000-0000-0000-0000000000aa',
  'RevenueOS Demo',
  'demo',
  jsonb_build_object(
    'industries', array['AI Infrastructure','Developer Tools','Data','Fintech'],
    'employee_range', jsonb_build_object('min', 50, 'max', 5000),
    'personas', array['VP Sales','Head of Sales','RevOps','CRO'],
    'pains', array['scaling outbound','prioritizing accounts','rep ramp time'],
    'keywords', array['enterprise','hiring','funding','launch']
  ),
  jsonb_build_object(
    'tone','consultative',
    'signature','— Sent via RevenueOS',
    'default_channels', array['email','call','linkedin']
  )
)
on conflict (id) do update set name = excluded.name, icp = excluded.icp;

-- ---- Accounts -------------------------------------------------------------
insert into public.accounts
  (id, team_id, name, domain, website, industry, description, employee_estimate,
   hq_location, stage, overall_score, fit_score, intent_score, timing_score,
   engagement_score, risk_penalty, why_now, recommended_action, last_researched_at)
values
  ('00000000-0000-0000-0000-0000000c0001','00000000-0000-0000-0000-0000000000aa',
   'Cursor','cursor.com','https://cursor.com','Developer Tools',
   'AI-native code editor building the future of programming with autonomous agents.',
   320,'San Francisco, CA','qualified',94,92,95,96,70,8,
   'Hiring 12 enterprise sales reps in 30 days — building a GTM motion now.',
   'Call VP Sales about scaling outbound', now() - interval '2 hours'),

  ('00000000-0000-0000-0000-0000000c0002','00000000-0000-0000-0000-0000000000aa',
   'Anthropic','anthropic.com','https://anthropic.com','AI Infrastructure',
   'AI safety company building reliable, interpretable, steerable AI systems.',
   1200,'San Francisco, CA','engaged',88,90,86,89,82,4,
   'New enterprise product launch — expansion of go-to-market.',
   'Send launch-based email to RevOps', now() - interval '5 hours'),

  ('00000000-0000-0000-0000-0000000c0003','00000000-0000-0000-0000-0000000000aa',
   'Databricks','databricks.com','https://databricks.com','Data',
   'Data + AI lakehouse platform for analytics and ML at enterprise scale.',
   7000,'San Francisco, CA','qualified',91,93,90,88,65,5,
   'New AI product launch + aggressive enterprise hiring.',
   'Call economic buyer', now() - interval '1 day'),

  ('00000000-0000-0000-0000-0000000c0004','00000000-0000-0000-0000-0000000000aa',
   'Rippling','rippling.com','https://rippling.com','Fintech',
   'Workforce management platform unifying HR, IT, and finance.',
   3500,'San Francisco, CA','researching',87,85,84,90,55,10,
   'Fresh funding round + compliance hiring spike.',
   'Send funding-based email', now() - interval '8 hours'),

  ('00000000-0000-0000-0000-0000000c0005','00000000-0000-0000-0000-0000000000aa',
   'Vercel','vercel.com','https://vercel.com','Developer Tools',
   'Frontend cloud for building and deploying web applications.',
   600,'San Francisco, CA','new',79,82,74,78,40,6,
   'Pricing page changed — new enterprise tier introduced.',
   'Generate sequence', now() - interval '3 days')
on conflict (id) do nothing;

-- ---- Contacts -------------------------------------------------------------
insert into public.contacts
  (id, team_id, account_id, full_name, title, seniority, department, email,
   linkedin_url, is_decision_maker, suggested_opener, confidence)
values
  ('00000000-0000-0000-0000-0000000d0001','00000000-0000-0000-0000-0000000000aa',
   '00000000-0000-0000-0000-0000000c0001','Jordan Mehta','VP of Sales','vp','Sales',
   'jordan@cursor.com','https://linkedin.com/in/jordanmehta',true,
   'Saw Cursor is scaling enterprise sales fast — how are you prioritizing which accounts get rep time?',92),
  ('00000000-0000-0000-0000-0000000d0002','00000000-0000-0000-0000-0000000000aa',
   '00000000-0000-0000-0000-0000000c0001','Priya Nair','Head of RevOps','director','RevOps',
   'priya@cursor.com','https://linkedin.com/in/priyanair',true,
   'With 12 new reps ramping, the prioritization bottleneck usually hits RevOps first.',86),
  ('00000000-0000-0000-0000-0000000d0003','00000000-0000-0000-0000-0000000000aa',
   '00000000-0000-0000-0000-0000000c0002','Sam Coleman','RevOps Lead','manager','RevOps',
   'sam@anthropic.com','https://linkedin.com/in/samcoleman',true,
   'Congrats on the enterprise launch — curious how you''re routing inbound to the right reps.',84),
  ('00000000-0000-0000-0000-0000000d0004','00000000-0000-0000-0000-0000000000aa',
   '00000000-0000-0000-0000-0000000c0003','Alex Romero','CRO','c_level','Sales',
   'alex@databricks.com','https://linkedin.com/in/alexromero',true,
   'New AI launch + hiring usually means rep capacity is the constraint — worth a quick chat?',88)
on conflict (id) do nothing;

-- ---- Signals --------------------------------------------------------------
insert into public.signals
  (id, team_id, account_id, type, title, summary, source_url, confidence,
   impact_score, recommended_action, status, dedupe_hash, detected_at)
values
  ('00000000-0000-0000-0000-0000000e0001','00000000-0000-0000-0000-0000000000aa',
   '00000000-0000-0000-0000-0000000c0001','hiring',
   'Hiring 12 enterprise sales roles',
   'Cursor added 12 enterprise sales roles in the last 30 days across AE, SE, and CS.',
   'https://cursor.com/careers',95,92,'Contact Head of Sales','new',
   'hiring:hiring-12-enterprise-sales-roles', now() - interval '2 hours'),
  ('00000000-0000-0000-0000-0000000e0002','00000000-0000-0000-0000-0000000000aa',
   '00000000-0000-0000-0000-0000000c0001','product',
   'Launched enterprise plan',
   'Cursor introduced an enterprise tier with SSO, audit logs, and admin controls.',
   'https://cursor.com/pricing',90,80,'Reference launch in opener','new',
   'product:launched-enterprise-plan', now() - interval '1 day'),
  ('00000000-0000-0000-0000-0000000e0003','00000000-0000-0000-0000-0000000000aa',
   '00000000-0000-0000-0000-0000000c0002','product',
   'New enterprise product launch',
   'Anthropic launched a new enterprise offering expanding its GTM surface area.',
   'https://anthropic.com/news',88,85,'Send launch-based email','new',
   'product:new-enterprise-product-launch', now() - interval '5 hours'),
  ('00000000-0000-0000-0000-0000000e0004','00000000-0000-0000-0000-0000000000aa',
   '00000000-0000-0000-0000-0000000c0004','funding',
   'Raised new funding round',
   'Rippling closed a new growth round, signaling expansion and budget availability.',
   'https://techcrunch.com',86,88,'Send funding-based email','new',
   'funding:raised-new-funding-round', now() - interval '8 hours'),
  ('00000000-0000-0000-0000-0000000e0005','00000000-0000-0000-0000-0000000000aa',
   '00000000-0000-0000-0000-0000000c0004','compliance',
   'Compliance hiring spike',
   'Rippling posted multiple compliance + security roles — a vendor evaluation signal.',
   'https://rippling.com/careers',78,70,'Lead with security/compliance angle','new',
   'compliance:compliance-hiring-spike', now() - interval '10 hours'),
  ('00000000-0000-0000-0000-0000000e0006','00000000-0000-0000-0000-0000000000aa',
   '00000000-0000-0000-0000-0000000c0005','pricing',
   'Pricing page change detected',
   'Vercel added a new enterprise pricing tier and removed the legacy team plan.',
   'https://vercel.com/pricing',82,68,'Generate sequence referencing new tier','new',
   'pricing:pricing-page-change-detected', now() - interval '3 days')
on conflict (account_id, dedupe_hash) do nothing;

-- ---- Risk flags -----------------------------------------------------------
insert into public.risk_flags
  (id, team_id, account_id, category, severity, title, detail, source_url, detected_at)
values
  ('00000000-0000-0000-0000-0000000f0001','00000000-0000-0000-0000-0000000000aa',
   '00000000-0000-0000-0000-0000000c0004','compliance','medium',
   'Active compliance buildout',
   'Rippling is expanding compliance staff — frame messaging around security posture, not speed.',
   'https://rippling.com/careers', now() - interval '10 hours')
on conflict (id) do nothing;

-- ---- A draft sequence + steps for Cursor ----------------------------------
insert into public.sequences
  (id, team_id, account_id, contact_id, name, persona, objective, tone, status)
values
  ('00000000-0000-0000-0000-000000a00001','00000000-0000-0000-0000-0000000000aa',
   '00000000-0000-0000-0000-0000000c0001','00000000-0000-0000-0000-0000000d0001',
   'Cursor — Enterprise Scaling','VP of Sales',
   'Book a 20-min intro on account prioritization','consultative','draft')
on conflict (id) do nothing;

insert into public.sequence_steps
  (team_id, sequence_id, step_order, channel, day_offset, instruction, content)
values
  ('00000000-0000-0000-0000-0000000000aa','00000000-0000-0000-0000-000000a00001',1,'email',0,
   'Mention the 12 enterprise sales hires; tie to account prioritization pain.',
   jsonb_build_object('subject','Scaling enterprise motion at Cursor','body',
   'Saw Cursor has been hiring aggressively across enterprise sales. Usually when teams hit this stage, the bottleneck becomes which accounts deserve rep time first...')),
  ('00000000-0000-0000-0000-0000000000aa','00000000-0000-0000-0000-000000a00001',2,'call',2,
   'Open with the scaling-sales-team angle; ROI on rep time.', '{}'::jsonb),
  ('00000000-0000-0000-0000-0000000000aa','00000000-0000-0000-0000-000000a00001',3,'linkedin',4,
   'Short note referencing company growth + enterprise launch.', '{}'::jsonb),
  ('00000000-0000-0000-0000-0000000000aa','00000000-0000-0000-0000-000000a00001',4,'email',7,
   'Share a relevant case study; soft CTA.', '{}'::jsonb)
on conflict (sequence_id, step_order) do nothing;

-- ---- Tasks (recommended actions) ------------------------------------------
insert into public.tasks
  (team_id, account_id, contact_id, signal_id, kind, status, priority, title, detail, due_at)
values
  ('00000000-0000-0000-0000-0000000000aa','00000000-0000-0000-0000-0000000c0001',
   '00000000-0000-0000-0000-0000000d0001','00000000-0000-0000-0000-0000000e0001',
   'call','open',1,'Call Jordan Mehta (VP Sales) at Cursor',
   'High-intent: 12 enterprise hires + enterprise launch. Use scaling angle.', now() + interval '1 day'),
  ('00000000-0000-0000-0000-0000000000aa','00000000-0000-0000-0000-0000000c0002',
   '00000000-0000-0000-0000-0000000d0003','00000000-0000-0000-0000-0000000e0003',
   'email','open',2,'Send launch-based email to Anthropic RevOps',
   'Reference new enterprise launch; offer prioritization demo.', now() + interval '2 days')
on conflict do nothing;

-- ---- Initial score history snapshot ---------------------------------------
insert into public.account_scores
  (team_id, account_id, overall_score, fit_score, intent_score, timing_score, engagement_score, risk_penalty, rationale)
select team_id, id, overall_score, fit_score, intent_score, timing_score, engagement_score, risk_penalty,
  jsonb_build_object('seeded', true, 'note','initial demo snapshot')
from public.accounts
where team_id = '00000000-0000-0000-0000-0000000000aa'
on conflict do nothing;
