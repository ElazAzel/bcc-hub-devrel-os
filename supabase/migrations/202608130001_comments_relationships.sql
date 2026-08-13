-- Comments and relationship indexes for the personal work graph.
-- parent_task_id and entity_relations already exist in the initial schema;
-- this migration adds the missing conversation layer and safe query paths.

create table if not exists public.entity_comments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  body text not null check (char_length(btrim(body)) between 1 and 10000),
  author_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists entity_comments_owner_entity_idx
  on public.entity_comments(owner_id, entity_type, entity_id, created_at);
create index if not exists entity_relations_owner_source_idx
  on public.entity_relations(owner_id, source_type, source_id);
create index if not exists entity_relations_owner_target_idx
  on public.entity_relations(owner_id, target_type, target_id);
create index if not exists tasks_owner_parent_idx
  on public.tasks(owner_id, parent_task_id, updated_at desc)
  where archived_at is null;

drop trigger if exists entity_comments_updated_at on public.entity_comments;
create trigger entity_comments_updated_at
  before update on public.entity_comments
  for each row execute function public.set_updated_at();

alter table public.entity_comments enable row level security;
drop policy if exists owner_select on public.entity_comments;
drop policy if exists owner_insert on public.entity_comments;
drop policy if exists owner_update on public.entity_comments;
drop policy if exists owner_delete on public.entity_comments;
create policy owner_select on public.entity_comments for select using (auth.uid() = owner_id);
create policy owner_insert on public.entity_comments for insert with check (auth.uid() = owner_id);
create policy owner_update on public.entity_comments for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy owner_delete on public.entity_comments for delete using (auth.uid() = owner_id);
