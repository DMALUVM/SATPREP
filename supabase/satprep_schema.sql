-- SAT Prep schema (cloud-first)
-- Run in Supabase SQL editor with service role privileges.

create extension if not exists pgcrypto;

create table if not exists public.sat_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('student', 'parent')),
  linked_student_id uuid references auth.users(id) on delete set null,
  display_name text,
  target_total_score integer not null default 1300,
  target_math_score integer not null default 650,
  sat_start_date date not null default date '2026-02-22',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sat_questions (
  id text primary key,
  version text not null,
  domain text not null,
  skill text not null,
  difficulty int not null check (difficulty between 1 and 5),
  format text not null check (format in ('multiple_choice', 'grid_in')),
  module text not null check (module in ('module-1', 'module-2', 'mixed')),
  calculator_allowed boolean not null default true,
  stem text not null,
  choices text[],
  answer_key jsonb not null,
  explanation_steps text[] not null,
  strategy_tip text,
  trap_tag text,
  target_seconds int not null default 95,
  tags text[] not null default '{}',
  template_key text,
  template_seed bigint,
  created_at timestamptz not null default now()
);

create table if not exists public.sat_question_variants (
  id text primary key,
  canonical_id text not null references public.sat_questions(id) on delete cascade,
  version text not null,
  stem text not null,
  choices text[],
  answer_key jsonb not null,
  explanation_steps text[] not null,
  strategy_tip text,
  trap_tag text,
  variant_index int not null,
  created_at timestamptz not null default now()
);

create table if not exists public.sat_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('diagnostic', 'practice', 'timed', 'review')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  question_ids text[] not null default '{}',
  correct_count int not null default 0,
  total_count int not null default 0,
  accuracy_pct numeric(5,2) not null default 0,
  avg_seconds numeric(8,2) not null default 0,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.sat_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  canonical_id text,
  session_id uuid references public.sat_sessions(id) on delete set null,
  session_mode text not null check (session_mode in ('diagnostic', 'practice', 'timed', 'review')),
  is_correct boolean not null,
  response_payload jsonb not null default '{}'::jsonb,
  seconds_spent int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists sat_attempts_student_created_idx on public.sat_attempts(student_id, created_at desc);
create index if not exists sat_attempts_student_skill_idx on public.sat_attempts(student_id, canonical_id, created_at desc);

create table if not exists public.sat_mastery (
  student_id uuid not null references auth.users(id) on delete cascade,
  skill text not null,
  mastery_score numeric(5,2) not null default 50,
  confidence numeric(5,2) not null default 0,
  last_seen_at timestamptz,
  due_for_review_at timestamptz,
  total_attempts int not null default 0,
  correct_attempts int not null default 0,
  avg_seconds numeric(8,2) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (student_id, skill)
);

create table if not exists public.sat_daily_missions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  plan_date date not null,
  tasks jsonb not null,
  target_minutes int not null default 50,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'complete')),
  completion_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, plan_date)
);

create table if not exists public.sat_weekly_reports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  highlights text[] not null default '{}',
  risks text[] not null default '{}',
  score_trend jsonb not null default '{}'::jsonb,
  domain_breakdown jsonb not null default '{}'::jsonb,
  recommended_actions text[] not null default '{}',
  report_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (student_id, week_start)
);

create or replace view public.sat_question_pool as
select
  q.id,
  q.id as canonical_id,
  false as is_variant,
  q.version,
  q.domain,
  q.skill,
  q.difficulty,
  q.format,
  q.module,
  q.calculator_allowed,
  q.stem,
  q.choices,
  q.answer_key,
  q.explanation_steps,
  q.strategy_tip,
  q.trap_tag,
  q.target_seconds,
  q.tags
from public.sat_questions q
union all
select
  v.id,
  v.canonical_id,
  true as is_variant,
  v.version,
  q.domain,
  q.skill,
  q.difficulty,
  q.format,
  q.module,
  q.calculator_allowed,
  v.stem,
  v.choices,
  v.answer_key,
  v.explanation_steps,
  v.strategy_tip,
  v.trap_tag,
  q.target_seconds,
  q.tags
from public.sat_question_variants v
join public.sat_questions q on q.id = v.canonical_id;

create or replace function public.is_parent_of(student uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.sat_profiles p
    where p.user_id = auth.uid()
      and p.role = 'parent'
      and p.linked_student_id = student
  );
$$;

alter table public.sat_profiles enable row level security;
alter table public.sat_questions enable row level security;
alter table public.sat_question_variants enable row level security;
alter table public.sat_sessions enable row level security;
alter table public.sat_attempts enable row level security;
alter table public.sat_mastery enable row level security;
alter table public.sat_daily_missions enable row level security;
alter table public.sat_weekly_reports enable row level security;

-- sat_profiles
drop policy if exists sat_profiles_select_own_or_child on public.sat_profiles;
create policy sat_profiles_select_own_or_child
on public.sat_profiles for select
using (auth.uid() = user_id or public.is_parent_of(user_id));

drop policy if exists sat_profiles_insert_own on public.sat_profiles;
create policy sat_profiles_insert_own
on public.sat_profiles for insert
with check (auth.uid() = user_id);

drop policy if exists sat_profiles_update_own on public.sat_profiles;
create policy sat_profiles_update_own
on public.sat_profiles for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- read-only question bank for authenticated users
drop policy if exists sat_questions_read_all_auth on public.sat_questions;
create policy sat_questions_read_all_auth
on public.sat_questions for select
using (auth.role() = 'authenticated');

drop policy if exists sat_question_variants_read_all_auth on public.sat_question_variants;
create policy sat_question_variants_read_all_auth
on public.sat_question_variants for select
using (auth.role() = 'authenticated');

-- sessions/attempts/mastery/missions/reports
drop policy if exists sat_sessions_rw on public.sat_sessions;
create policy sat_sessions_rw
on public.sat_sessions for all
using (student_id = auth.uid() or public.is_parent_of(student_id))
with check (student_id = auth.uid());

drop policy if exists sat_attempts_rw on public.sat_attempts;
create policy sat_attempts_rw
on public.sat_attempts for all
using (student_id = auth.uid() or public.is_parent_of(student_id))
with check (student_id = auth.uid());

drop policy if exists sat_mastery_rw on public.sat_mastery;
create policy sat_mastery_rw
on public.sat_mastery for all
using (student_id = auth.uid() or public.is_parent_of(student_id))
with check (student_id = auth.uid());

drop policy if exists sat_daily_missions_rw on public.sat_daily_missions;
create policy sat_daily_missions_rw
on public.sat_daily_missions for all
using (student_id = auth.uid() or public.is_parent_of(student_id))
with check (student_id = auth.uid());

drop policy if exists sat_weekly_reports_rw on public.sat_weekly_reports;
create policy sat_weekly_reports_rw
on public.sat_weekly_reports for all
using (student_id = auth.uid() or public.is_parent_of(student_id))
with check (student_id = auth.uid());
