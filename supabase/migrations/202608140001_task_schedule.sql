alter table public.tasks
  add column if not exists start_time time,
  add column if not exists end_time time,
  add column if not exists meeting_mode text,
  add column if not exists meeting_url text,
  add column if not exists location text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tasks_meeting_mode_check'
      and conrelid = 'public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_meeting_mode_check
      check (meeting_mode is null or meeting_mode in ('online', 'offline'));
  end if;
end $$;

create index if not exists tasks_owner_schedule_idx
  on public.tasks(owner_id, start_date, start_time)
  where archived_at is null;
