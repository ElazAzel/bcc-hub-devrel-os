-- Shared planning dates and task delivery measurements.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'organizations', 'projects', 'contacts', 'tasks', 'interactions', 'commitments',
    'events', 'content_items', 'communities', 'ambassadors', 'tech_radar_items',
    'documents', 'decisions', 'knowledge_cases'
  ] loop
    execute format('alter table public.%I add column if not exists start_date date', table_name);
    execute format('alter table public.%I add column if not exists end_date date', table_name);
  end loop;
end $$;

alter table public.tasks
  add column if not exists schedule_variance_reason text;

update public.projects set end_date = due_date where end_date is null and due_date is not null;
update public.tasks set end_date = due_date where end_date is null and due_date is not null;
update public.events set start_date = date_start where start_date is null and date_start is not null;
update public.events set end_date = date_end where end_date is null and date_end is not null;

do $$
declare
  table_name text;
  constraint_name text;
begin
  foreach table_name in array array[
    'organizations', 'projects', 'contacts', 'tasks', 'interactions', 'commitments',
    'events', 'content_items', 'communities', 'ambassadors', 'tech_radar_items',
    'documents', 'decisions', 'knowledge_cases'
  ] loop
    constraint_name := table_name || '_planning_dates_check';
    if not exists (
      select 1 from pg_constraint
      where conname = constraint_name and conrelid = format('public.%I', table_name)::regclass
    ) then
      execute format('alter table public.%I add constraint %I check (end_date is null or start_date is null or end_date >= start_date)', table_name, constraint_name);
    end if;
  end loop;
end $$;

create index if not exists tasks_owner_timing_idx
  on public.tasks(owner_id, start_date, end_date, completed_at)
  where archived_at is null;
