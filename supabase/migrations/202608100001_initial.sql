create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  weekly_focus text,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null, type text, website text, description text, city text, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz
);
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null, description text, direction text, project_type text, status text default 'Idea', priority text default 'Medium',
  start_date date, due_date date, parent_project_id uuid references public.projects(id) on delete set null, goal text, expected_result text, actual_result text,
  next_action text, health_score integer, health_state text, last_activity_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz
);
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  first_name text, last_name text, name text, position text, department text, email text, phone text, telegram text, linkedin text, city text,
  organization_name text, relationship_type text, relationship_score integer, relationship_state text, notes text, last_interaction_at timestamptz, next_follow_up_at date,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz
);
create table if not exists public.contact_organizations (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade, organization_id uuid not null references public.organizations(id) on delete cascade,
  created_at timestamptz not null default now(), unique(contact_id, organization_id)
);
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null, description text, status text default 'Inbox', priority text default 'Normal', project_id uuid references public.projects(id) on delete set null,
  parent_task_id uuid references public.tasks(id) on delete set null, start_date date, due_date date, source_type text, source_label text, source_date date,
  requested_by_contact_id uuid references public.contacts(id) on delete set null, context text, expected_result text, next_action text, blocker text, actual_result text, retrospective text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), completed_at timestamptz, archived_at timestamptz
);
create table if not exists public.interactions (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  date date, type text, title text not null, topic text, summary text, what_i_said text, what_they_said text, decision text, next_action text, follow_up_date date,
  project_id uuid references public.projects(id) on delete set null, event_id uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz
);
create table if not exists public.interaction_contacts (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  interaction_id uuid not null references public.interactions(id) on delete cascade, contact_id uuid not null references public.contacts(id) on delete cascade,
  created_at timestamptz not null default now(), unique(interaction_id, contact_id)
);
create table if not exists public.commitments (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null, description text, owed_by text default 'me', contact_id uuid references public.contacts(id) on delete set null, project_id uuid references public.projects(id) on delete set null,
  interaction_id uuid references public.interactions(id) on delete set null, due_date date, status text default 'Open',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz
);
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null, type text, project_id uuid references public.projects(id) on delete set null, date_start date, date_end date, location text, format text, audience text,
  capacity integer, registration_target integer, registrations integer default 0, confirmed integer default 0, attended integer default 0, nps numeric, budget_planned numeric, budget_actual numeric,
  status text default 'Idea', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz
);
create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null, content_type text, channel text, author_contact_id uuid references public.contacts(id) on delete set null, ambassador_id uuid, project_id uuid references public.projects(id) on delete set null,
  event_id uuid references public.events(id) on delete set null, community_id uuid, status text default 'Idea', planned_date date, published_at timestamptz, external_url text,
  views integer default 0, reach integer default 0, likes integer default 0, comments integer default 0, shares integer default 0, description text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz
);
create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null, description text, status text default 'Active', owner_contact_id uuid references public.contacts(id) on delete set null, last_activity_at timestamptz, next_activity_at date, members_count integer default 0,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz
);
create table if not exists public.ambassadors (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null, name text not null, track text default 'Technical', level text default 'LV.0 Newcomer', start_date date, status text default 'Onboarding',
  total_xp integer not null default 0, current_quarter_xp integer not null default 0, training_progress integer not null default 0, last_contribution_at timestamptz, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz
);
create table if not exists public.ambassador_contributions (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  ambassador_id uuid not null references public.ambassadors(id) on delete cascade, type text, base_xp integer not null, multiplier numeric not null default 1, final_xp integer not null,
  date date not null default current_date, evidence_url text, project_id uuid references public.projects(id) on delete set null, event_id uuid references public.events(id) on delete set null, content_id uuid references public.content_items(id) on delete set null,
  status text default 'Pending', review_note text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.ambassador_training (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  ambassador_id uuid not null references public.ambassadors(id) on delete cascade, title text not null, status text default 'Not Started', homework_url text, reviewed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(ambassador_id, title)
);
create table if not exists public.tech_radar_items (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null, slug text, domain text default 'Backend', category text, ring text, change_state text default 'Unchanged', description text, recommendation text, rationale text, version text,
  owner_contact_id uuid references public.contacts(id) on delete set null, last_reviewed_at date, public_url text, status text default 'Draft', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz
);
create table if not exists public.tech_radar_versions (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade, label text not null, published_at date, snapshot jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null, type text, location_type text, external_url text, storage_path text, project_id uuid references public.projects(id) on delete set null, task_id uuid references public.tasks(id) on delete set null, event_id uuid references public.events(id) on delete set null, contact_id uuid references public.contacts(id) on delete set null, ambassador_id uuid references public.ambassadors(id) on delete set null,
  version text, status text default 'Active', description text, last_updated_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz
);
create table if not exists public.decisions (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null, date date, context text, problem text, options text, decision text, reason text, consequences text, review_date date, project_id uuid references public.projects(id) on delete set null, task_id uuid references public.tasks(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz
);
create table if not exists public.knowledge_cases (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null, situation text, problem text, trigger text, people text, actions text, communication text, decision text, result text, what_worked text, what_failed text, reusable_solution text, tags text[], project_id uuid references public.projects(id) on delete set null, task_id uuid references public.tasks(id) on delete set null, event_id uuid references public.events(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz
);
create table if not exists public.kpis (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade, title text not null, value numeric, target numeric, unit text, period text, project_id uuid references public.projects(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz
);
create table if not exists public.entity_relations (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade, source_type text not null, source_id uuid not null, relation_type text not null, target_type text not null, target_id uuid not null, created_at timestamptz not null default now(), unique(owner_id, source_type, source_id, relation_type, target_type, target_id)
);
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade, name text not null, color text, created_at timestamptz not null default now(), unique(owner_id, name)
);
create table if not exists public.entity_tags (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade, entity_type text not null, entity_id uuid not null, tag_id uuid not null references public.tags(id) on delete cascade, created_at timestamptz not null default now(), unique(owner_id, entity_type, entity_id, tag_id)
);
create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade, action text not null, entity_type text not null, entity_id uuid, message text, metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade, name text not null, entity_type text not null, config jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.saved_views (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade, name text not null, entity_type text not null, config jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create index if not exists projects_owner_status_idx on public.projects(owner_id, status) where archived_at is null;
create index if not exists tasks_owner_due_idx on public.tasks(owner_id, due_date) where archived_at is null;
create index if not exists contacts_owner_followup_idx on public.contacts(owner_id, next_follow_up_at) where archived_at is null;
create index if not exists events_owner_date_idx on public.events(owner_id, date_start) where archived_at is null;
create index if not exists content_owner_status_idx on public.content_items(owner_id, status) where archived_at is null;
create index if not exists radar_owner_ring_idx on public.tech_radar_items(owner_id, ring) where archived_at is null;
create index if not exists activity_owner_created_idx on public.activity_log(owner_id, created_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
do $$ declare t text; begin foreach t in array array['profiles','organizations','projects','contacts','tasks','interactions','commitments','events','content_items','communities','ambassadors','ambassador_contributions','ambassador_training','tech_radar_items','documents','decisions','knowledge_cases','kpis','templates','saved_views'] loop execute format('drop trigger if exists %I_updated_at on public.%I', t, t); execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t); end loop; end $$;

alter table public.profiles enable row level security;
do $$ declare t text; begin foreach t in array array['profiles','organizations','projects','contacts','contact_organizations','tasks','interactions','interaction_contacts','commitments','events','content_items','communities','ambassadors','ambassador_contributions','ambassador_training','tech_radar_items','tech_radar_versions','documents','decisions','knowledge_cases','kpis','entity_relations','tags','entity_tags','activity_log','templates','saved_views'] loop execute format('alter table public.%I enable row level security', t); execute format('drop policy if exists owner_select on public.%I', t); execute format('drop policy if exists owner_insert on public.%I', t); execute format('drop policy if exists owner_update on public.%I', t); execute format('drop policy if exists owner_delete on public.%I', t); execute format('create policy owner_select on public.%I for select using (auth.uid() = owner_id)', t); execute format('create policy owner_insert on public.%I for insert with check (auth.uid() = owner_id)', t); execute format('create policy owner_update on public.%I for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id)', t); execute format('create policy owner_delete on public.%I for delete using (auth.uid() = owner_id)', t); end loop; end $$;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$ begin insert into public.profiles (id, owner_id, display_name) values (new.id, new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))); return new; end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
