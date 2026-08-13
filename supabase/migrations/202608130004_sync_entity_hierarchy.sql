-- Keep the canonical hierarchy synchronized for writes that do not pass through
-- the browser data layer (Telegram, server jobs and future integrations).

create or replace function public.sync_entity_parent_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_child_type text;
  v_parent_type text;
  v_parent_id uuid;
  v_relation_type text := 'PART_OF';
begin
  if auth.uid() is not null and auth.uid() <> new.owner_id then
    raise exception 'Нельзя изменить иерархию чужой записи';
  end if;

  v_child_type := case tg_table_name
    when 'projects' then 'projects'
    when 'events' then 'events'
    when 'tasks' then 'tasks'
    when 'interactions' then 'interactions'
    when 'commitments' then 'commitments'
    when 'content_items' then 'content'
    when 'documents' then 'documents'
    when 'decisions' then 'decisions'
    when 'knowledge_cases' then 'knowledge'
  end;

  if v_child_type is null then return new; end if;

  if v_child_type = 'projects' then
    v_parent_type := 'projects';
    v_parent_id := new.parent_project_id;
    v_relation_type := 'SUBPROJECT_OF';
  elsif v_child_type = 'events' then
    v_parent_type := 'projects';
    v_parent_id := new.project_id;
  elsif v_child_type = 'tasks' then
    if new.parent_task_id is not null then
      v_parent_type := 'tasks'; v_parent_id := new.parent_task_id; v_relation_type := 'SUBTASK_OF';
    elsif new.event_id is not null then
      v_parent_type := 'events'; v_parent_id := new.event_id;
    else
      v_parent_type := 'projects'; v_parent_id := new.project_id;
    end if;
  elsif v_child_type = 'interactions' then
    if new.task_id is not null then v_parent_type := 'tasks'; v_parent_id := new.task_id;
    elsif new.event_id is not null then v_parent_type := 'events'; v_parent_id := new.event_id;
    else v_parent_type := 'projects'; v_parent_id := new.project_id;
    end if;
  elsif v_child_type = 'commitments' then
    if new.task_id is not null then v_parent_type := 'tasks'; v_parent_id := new.task_id;
    elsif new.event_id is not null then v_parent_type := 'events'; v_parent_id := new.event_id;
    elsif new.project_id is not null then v_parent_type := 'projects'; v_parent_id := new.project_id;
    else v_parent_type := 'interactions'; v_parent_id := new.interaction_id;
    end if;
  elsif v_child_type in ('content', 'documents', 'decisions', 'knowledge') then
    if new.task_id is not null then v_parent_type := 'tasks'; v_parent_id := new.task_id;
    elsif new.event_id is not null then v_parent_type := 'events'; v_parent_id := new.event_id;
    else v_parent_type := 'projects'; v_parent_id := new.project_id;
    end if;
    if v_child_type = 'knowledge' then v_relation_type := 'NOTE_ON'; end if;
  end if;

  delete from public.entity_parent_links
  where owner_id = new.owner_id and entity_parent_links.child_type = v_child_type and child_id = new.id;

  if v_parent_id is not null then
    insert into public.entity_parent_links(owner_id, child_type, child_id, parent_type, parent_id, relation_type)
    values (new.owner_id, v_child_type, new.id, v_parent_type, v_parent_id, v_relation_type)
    on conflict (owner_id, child_type, child_id) do update set
      parent_type = excluded.parent_type,
      parent_id = excluded.parent_id,
      relation_type = excluded.relation_type;
  end if;
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['projects','events','tasks','interactions','commitments','content_items','documents','decisions','knowledge_cases'] loop
    execute format('drop trigger if exists sync_entity_parent_link on public.%I', table_name);
    execute format('create trigger sync_entity_parent_link after insert or update on public.%I for each row execute function public.sync_entity_parent_link()', table_name);
  end loop;
end;
$$;
