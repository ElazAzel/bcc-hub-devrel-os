-- Contact directory and a single relation layer for every workspace record.
-- The employee source file is intentionally imported by the UI and is not
-- stored in Git or in this migration.

alter table public.contacts
  add column if not exists contact_kind text not null default 'External';

create index if not exists contacts_owner_kind_idx
  on public.contacts(owner_id, contact_kind, updated_at desc)
  where archived_at is null;

create table if not exists public.entity_contact_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  role text not null default 'participant',
  created_at timestamptz not null default now(),
  unique(owner_id, entity_type, entity_id, contact_id)
);

create index if not exists entity_contact_links_owner_entity_idx
  on public.entity_contact_links(owner_id, entity_type, entity_id, created_at);
create index if not exists entity_contact_links_owner_contact_idx
  on public.entity_contact_links(owner_id, contact_id, created_at);

alter table public.entity_contact_links enable row level security;
drop policy if exists owner_select on public.entity_contact_links;
drop policy if exists owner_insert on public.entity_contact_links;
drop policy if exists owner_update on public.entity_contact_links;
drop policy if exists owner_delete on public.entity_contact_links;
create policy owner_select on public.entity_contact_links for select using (auth.uid() = owner_id);
create policy owner_insert on public.entity_contact_links for insert with check (auth.uid() = owner_id);
create policy owner_update on public.entity_contact_links for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy owner_delete on public.entity_contact_links for delete using (auth.uid() = owner_id);

insert into public.entity_contact_links (owner_id, entity_type, entity_id, contact_id, role, created_at)
select owner_id, 'interactions', interaction_id, contact_id, 'participant', created_at
from public.interaction_contacts
on conflict (owner_id, entity_type, entity_id, contact_id) do nothing;
