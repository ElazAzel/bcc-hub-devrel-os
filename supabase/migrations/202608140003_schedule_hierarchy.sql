-- Keep parent planning periods wide enough to contain their children.
-- Tasks expand parent tasks, events and projects; projects expand parent projects.

create or replace function public.enforce_planning_parent_range()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  child_start date;
  child_end date;
  current_end date;
begin
  if tg_table_name = 'tasks' then
    select min(start_date), max(coalesce(end_date, due_date))
      into child_start, child_end
      from public.tasks
      where parent_task_id = new.id and id <> new.id and archived_at is null;

    if child_start is not null and (new.start_date is null or child_start < new.start_date) then
      new.start_date := child_start;
    end if;
    current_end := coalesce(new.end_date, new.due_date);
    if child_end is not null and (current_end is null or child_end > current_end) then
      new.end_date := child_end;
    end if;
  elsif tg_table_name = 'events' then
    select min(start_date), max(coalesce(end_date, due_date))
      into child_start, child_end
      from public.tasks
      where event_id = new.id and archived_at is null;

    if child_start is not null and (coalesce(new.start_date, new.date_start) is null or child_start < coalesce(new.start_date, new.date_start)) then
      new.start_date := child_start;
      new.date_start := child_start;
    end if;
    if child_end is not null and (coalesce(new.end_date, new.date_end) is null or child_end > coalesce(new.end_date, new.date_end)) then
      new.end_date := child_end;
      new.date_end := child_end;
    end if;
  elsif tg_table_name = 'projects' then
    select min(range_start), max(range_end)
      into child_start, child_end
      from (
        select start_date as range_start, coalesce(end_date, due_date) as range_end
          from public.projects
          where parent_project_id = new.id and archived_at is null
        union all
        select coalesce(start_date, date_start), coalesce(end_date, date_end)
          from public.events
          where project_id = new.id and archived_at is null
        union all
        select start_date, coalesce(end_date, due_date)
          from public.tasks
          where project_id = new.id and archived_at is null
      ) child_ranges;

    if child_start is not null and (new.start_date is null or child_start < new.start_date) then
      new.start_date := child_start;
    end if;
    current_end := coalesce(new.end_date, new.due_date);
    if child_end is not null and (current_end is null or child_end > current_end) then
      new.end_date := child_end;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.expand_schedule_parent(
  parent_table text,
  parent_id uuid,
  p_owner_id uuid,
  child_start date,
  child_end date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if child_start is null and child_end is null then return; end if;

  if parent_table = 'events' then
    update public.events
       set start_date = case when child_start is not null and (start_date is null or child_start < start_date) then child_start else start_date end,
           end_date = case when child_end is not null and (end_date is null or child_end > end_date) then child_end else end_date end,
           date_start = case when child_start is not null and (date_start is null or child_start < date_start) then child_start else date_start end,
           date_end = case when child_end is not null and (date_end is null or child_end > date_end) then child_end else date_end end
     where id = parent_id and public.events.owner_id = p_owner_id
       and ((child_start is not null and (start_date is null or child_start < start_date))
         or (child_end is not null and (end_date is null or child_end > end_date)));
  elsif parent_table = 'tasks' then
    update public.tasks
       set start_date = case when child_start is not null and (start_date is null or child_start < start_date) then child_start else start_date end,
           end_date = case when child_end is not null and (end_date is null or child_end > end_date) then child_end else end_date end
     where id = parent_id and public.tasks.owner_id = p_owner_id
       and ((child_start is not null and (start_date is null or child_start < start_date))
         or (child_end is not null and (end_date is null or child_end > end_date)));
  elsif parent_table = 'projects' then
    update public.projects
       set start_date = case when child_start is not null and (start_date is null or child_start < start_date) then child_start else start_date end,
           end_date = case when child_end is not null and (end_date is null or child_end > end_date) then child_end else end_date end
     where id = parent_id and public.projects.owner_id = p_owner_id
       and ((child_start is not null and (start_date is null or child_start < start_date))
         or (child_end is not null and (end_date is null or child_end > end_date)));
  end if;
end;
$$;

create or replace function public.propagate_planning_parent_range()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  child_start date;
  child_end date;
begin
  if tg_table_name = 'tasks' then
    child_start := new.start_date;
    child_end := coalesce(new.end_date, new.due_date);
    if new.parent_task_id is not null then
      perform public.expand_schedule_parent('tasks', new.parent_task_id, new.owner_id, child_start, child_end);
    end if;
    if new.event_id is not null then
      perform public.expand_schedule_parent('events', new.event_id, new.owner_id, child_start, child_end);
    end if;
    if new.project_id is not null then
      perform public.expand_schedule_parent('projects', new.project_id, new.owner_id, child_start, child_end);
    end if;
  elsif tg_table_name = 'events' then
    child_start := coalesce(new.start_date, new.date_start);
    child_end := coalesce(new.end_date, new.date_end);
    if new.project_id is not null then
      perform public.expand_schedule_parent('projects', new.project_id, new.owner_id, child_start, child_end);
    end if;
  elsif tg_table_name = 'projects' then
    child_start := new.start_date;
    child_end := coalesce(new.end_date, new.due_date);
    if new.parent_project_id is not null then
      perform public.expand_schedule_parent('projects', new.parent_project_id, new.owner_id, child_start, child_end);
    end if;
  end if;
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['projects', 'events', 'tasks'] loop
    execute format('drop trigger if exists enforce_planning_parent_range on public.%I', table_name);
    execute format('create trigger enforce_planning_parent_range before insert or update on public.%I for each row execute function public.enforce_planning_parent_range()', table_name);
    execute format('drop trigger if exists propagate_planning_parent_range on public.%I', table_name);
    execute format('create trigger propagate_planning_parent_range after insert or update on public.%I for each row execute function public.propagate_planning_parent_range()', table_name);
  end loop;
end;
$$;

-- Bring existing parent periods up to date after installing the triggers.
update public.tasks set updated_at = updated_at where archived_at is null;
update public.events set updated_at = updated_at where archived_at is null;
update public.projects set updated_at = updated_at where archived_at is null;
