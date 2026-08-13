-- Canonical parent context for the work graph.
-- Direct foreign keys remain useful for filters and compatibility; this table
-- is the single source of truth for the visible parent/child tree.

alter table public.tasks add column if not exists event_id uuid references public.events(id) on delete set null;
alter table public.interactions add column if not exists task_id uuid references public.tasks(id) on delete set null;
alter table public.commitments add column if not exists event_id uuid references public.events(id) on delete set null;
alter table public.commitments add column if not exists task_id uuid references public.tasks(id) on delete set null;
alter table public.content_items add column if not exists task_id uuid references public.tasks(id) on delete set null;
alter table public.decisions add column if not exists event_id uuid references public.events(id) on delete set null;

create table if not exists public.entity_parent_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  child_type text not null check (child_type in ('projects', 'events', 'tasks', 'interactions', 'commitments', 'content', 'documents', 'decisions', 'knowledge')),
  child_id uuid not null,
  parent_type text not null check (parent_type in ('projects', 'events', 'tasks', 'interactions')),
  parent_id uuid not null,
  relation_type text not null default 'PART_OF',
  created_at timestamptz not null default now(),
  unique(owner_id, child_type, child_id)
);

create index if not exists entity_parent_links_owner_parent_idx
  on public.entity_parent_links(owner_id, parent_type, parent_id, created_at);
create index if not exists entity_parent_links_owner_child_idx
  on public.entity_parent_links(owner_id, child_type, child_id);

-- Backfill in priority order. A child receives exactly one direct parent:
-- subtask > task > event > project (or interaction where that is the only context).
insert into public.entity_parent_links(owner_id, child_type, child_id, parent_type, parent_id, relation_type)
select owner_id, 'projects', id, 'projects', parent_project_id, 'SUBPROJECT_OF'
from public.projects
where parent_project_id is not null
on conflict (owner_id, child_type, child_id) do nothing;

insert into public.entity_parent_links(owner_id, child_type, child_id, parent_type, parent_id, relation_type)
select owner_id, 'events', id, 'projects', project_id, 'PART_OF'
from public.events
where project_id is not null
on conflict (owner_id, child_type, child_id) do nothing;

insert into public.entity_parent_links(owner_id, child_type, child_id, parent_type, parent_id, relation_type)
select owner_id, 'tasks', id, 'tasks', parent_task_id, 'SUBTASK_OF'
from public.tasks
where parent_task_id is not null
on conflict (owner_id, child_type, child_id) do nothing;
insert into public.entity_parent_links(owner_id, child_type, child_id, parent_type, parent_id, relation_type)
select owner_id, 'tasks', id, 'events', event_id, 'PART_OF'
from public.tasks
where parent_task_id is null and event_id is not null
on conflict (owner_id, child_type, child_id) do nothing;
insert into public.entity_parent_links(owner_id, child_type, child_id, parent_type, parent_id, relation_type)
select owner_id, 'tasks', id, 'projects', project_id, 'PART_OF'
from public.tasks
where parent_task_id is null and event_id is null and project_id is not null
on conflict (owner_id, child_type, child_id) do nothing;

insert into public.entity_parent_links(owner_id, child_type, child_id, parent_type, parent_id, relation_type)
select owner_id, 'interactions', id, 'tasks', task_id, 'PART_OF'
from public.interactions
where task_id is not null
on conflict (owner_id, child_type, child_id) do nothing;
insert into public.entity_parent_links(owner_id, child_type, child_id, parent_type, parent_id, relation_type)
select owner_id, 'interactions', id, 'events', event_id, 'PART_OF'
from public.interactions
where task_id is null and event_id is not null
on conflict (owner_id, child_type, child_id) do nothing;
insert into public.entity_parent_links(owner_id, child_type, child_id, parent_type, parent_id, relation_type)
select owner_id, 'interactions', id, 'projects', project_id, 'PART_OF'
from public.interactions
where task_id is null and event_id is null and project_id is not null
on conflict (owner_id, child_type, child_id) do nothing;

insert into public.entity_parent_links(owner_id, child_type, child_id, parent_type, parent_id, relation_type)
select owner_id, 'commitments', id, 'tasks', task_id, 'PART_OF'
from public.commitments
where task_id is not null
on conflict (owner_id, child_type, child_id) do nothing;
insert into public.entity_parent_links(owner_id, child_type, child_id, parent_type, parent_id, relation_type)
select owner_id, 'commitments', id, 'events', event_id, 'PART_OF'
from public.commitments
where task_id is null and event_id is not null
on conflict (owner_id, child_type, child_id) do nothing;
insert into public.entity_parent_links(owner_id, child_type, child_id, parent_type, parent_id, relation_type)
select owner_id, 'commitments', id, 'projects', project_id, 'PART_OF'
from public.commitments
where task_id is null and event_id is null and project_id is not null
on conflict (owner_id, child_type, child_id) do nothing;
insert into public.entity_parent_links(owner_id, child_type, child_id, parent_type, parent_id, relation_type)
select owner_id, 'commitments', id, 'interactions', interaction_id, 'PART_OF'
from public.commitments
where task_id is null and event_id is null and project_id is null and interaction_id is not null
on conflict (owner_id, child_type, child_id) do nothing;

insert into public.entity_parent_links(owner_id, child_type, child_id, parent_type, parent_id, relation_type)
select owner_id, 'content', id, 'tasks', task_id, 'PART_OF'
from public.content_items
where task_id is not null
on conflict (owner_id, child_type, child_id) do nothing;
insert into public.entity_parent_links(owner_id, child_type, child_id, parent_type, parent_id, relation_type)
select owner_id, 'content', id, 'events', event_id, 'PART_OF'
from public.content_items
where task_id is null and event_id is not null
on conflict (owner_id, child_type, child_id) do nothing;
insert into public.entity_parent_links(owner_id, child_type, child_id, parent_type, parent_id, relation_type)
select owner_id, 'content', id, 'projects', project_id, 'PART_OF'
from public.content_items
where task_id is null and event_id is null and project_id is not null
on conflict (owner_id, child_type, child_id) do nothing;

insert into public.entity_parent_links(owner_id, child_type, child_id, parent_type, parent_id, relation_type)
select owner_id, 'documents', id, 'tasks', task_id, 'PART_OF'
from public.documents
where task_id is not null
on conflict (owner_id, child_type, child_id) do nothing;
insert into public.entity_parent_links(owner_id, child_type, child_id, parent_type, parent_id, relation_type)
select owner_id, 'documents', id, 'events', event_id, 'PART_OF'
from public.documents
where task_id is null and event_id is not null
on conflict (owner_id, child_type, child_id) do nothing;
insert into public.entity_parent_links(owner_id, child_type, child_id, parent_type, parent_id, relation_type)
select owner_id, 'documents', id, 'projects', project_id, 'PART_OF'
from public.documents
where task_id is null and event_id is null and project_id is not null
on conflict (owner_id, child_type, child_id) do nothing;

insert into public.entity_parent_links(owner_id, child_type, child_id, parent_type, parent_id, relation_type)
select owner_id, 'decisions', id, 'tasks', task_id, 'PART_OF'
from public.decisions
where task_id is not null
on conflict (owner_id, child_type, child_id) do nothing;
insert into public.entity_parent_links(owner_id, child_type, child_id, parent_type, parent_id, relation_type)
select owner_id, 'decisions', id, 'events', event_id, 'PART_OF'
from public.decisions
where task_id is null and event_id is not null
on conflict (owner_id, child_type, child_id) do nothing;
insert into public.entity_parent_links(owner_id, child_type, child_id, parent_type, parent_id, relation_type)
select owner_id, 'decisions', id, 'projects', project_id, 'PART_OF'
from public.decisions
where task_id is null and event_id is null and project_id is not null
on conflict (owner_id, child_type, child_id) do nothing;

insert into public.entity_parent_links(owner_id, child_type, child_id, parent_type, parent_id, relation_type)
select owner_id, 'knowledge', id, 'tasks', task_id, 'NOTE_ON'
from public.knowledge_cases
where task_id is not null
on conflict (owner_id, child_type, child_id) do nothing;
insert into public.entity_parent_links(owner_id, child_type, child_id, parent_type, parent_id, relation_type)
select owner_id, 'knowledge', id, 'events', event_id, 'NOTE_ON'
from public.knowledge_cases
where task_id is null and event_id is not null
on conflict (owner_id, child_type, child_id) do nothing;
insert into public.entity_parent_links(owner_id, child_type, child_id, parent_type, parent_id, relation_type)
select owner_id, 'knowledge', id, 'projects', project_id, 'NOTE_ON'
from public.knowledge_cases
where task_id is null and event_id is null and project_id is not null
on conflict (owner_id, child_type, child_id) do nothing;

alter table public.entity_parent_links enable row level security;
drop policy if exists owner_select on public.entity_parent_links;
drop policy if exists owner_insert on public.entity_parent_links;
drop policy if exists owner_update on public.entity_parent_links;
drop policy if exists owner_delete on public.entity_parent_links;
create policy owner_select on public.entity_parent_links for select using (auth.uid() = owner_id);
create policy owner_insert on public.entity_parent_links for insert with check (auth.uid() = owner_id);
create policy owner_update on public.entity_parent_links for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy owner_delete on public.entity_parent_links for delete using (auth.uid() = owner_id);
