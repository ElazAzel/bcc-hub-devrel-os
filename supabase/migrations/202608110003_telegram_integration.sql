create table if not exists public.telegram_link_codes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists telegram_link_codes_owner_idx
  on public.telegram_link_codes(owner_id, created_at desc)
  where used_at is null;

create table if not exists public.telegram_connections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references auth.users(id) on delete cascade,
  chat_id bigint not null unique,
  username text,
  first_name text,
  last_name text,
  connected_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists telegram_connections_chat_idx
  on public.telegram_connections(chat_id);

create table if not exists public.telegram_updates (
  update_id bigint primary key,
  chat_id bigint not null,
  received_at timestamptz not null default now()
);

create index if not exists telegram_updates_received_idx
  on public.telegram_updates(received_at desc);

alter table public.telegram_link_codes enable row level security;
alter table public.telegram_connections enable row level security;
alter table public.telegram_updates enable row level security;

drop policy if exists owner_select on public.telegram_link_codes;
drop policy if exists owner_insert on public.telegram_link_codes;
drop policy if exists owner_update on public.telegram_link_codes;
drop policy if exists owner_delete on public.telegram_link_codes;
create policy owner_select on public.telegram_link_codes for select using (auth.uid() = owner_id);
create policy owner_insert on public.telegram_link_codes for insert with check (auth.uid() = owner_id);
create policy owner_update on public.telegram_link_codes for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy owner_delete on public.telegram_link_codes for delete using (auth.uid() = owner_id);

drop policy if exists owner_select on public.telegram_connections;
drop policy if exists owner_insert on public.telegram_connections;
drop policy if exists owner_update on public.telegram_connections;
drop policy if exists owner_delete on public.telegram_connections;
create policy owner_select on public.telegram_connections for select using (auth.uid() = owner_id);
create policy owner_insert on public.telegram_connections for insert with check (auth.uid() = owner_id);
create policy owner_update on public.telegram_connections for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy owner_delete on public.telegram_connections for delete using (auth.uid() = owner_id);

drop policy if exists owner_select on public.telegram_updates;
drop policy if exists owner_insert on public.telegram_updates;
drop policy if exists owner_update on public.telegram_updates;
drop policy if exists owner_delete on public.telegram_updates;

drop trigger if exists telegram_connections_updated_at on public.telegram_connections;
create trigger telegram_connections_updated_at
  before update on public.telegram_connections
  for each row execute function public.set_updated_at();

create or replace function public.consume_telegram_link_code(
  p_code_hash text,
  p_chat_id bigint,
  p_username text default null,
  p_first_name text default null,
  p_last_name text default null
)
returns table(owner_id uuid, connected boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  link_row public.telegram_link_codes%rowtype;
begin
  select * into link_row
  from public.telegram_link_codes
  where code_hash = p_code_hash
    and used_at is null
    and expires_at > now()
  for update;

  if not found then
    return;
  end if;

  if exists (
    select 1 from public.telegram_connections
    where chat_id = p_chat_id and owner_id <> link_row.owner_id
  ) then
    return;
  end if;

  update public.telegram_link_codes
  set used_at = now()
  where id = link_row.id;

  insert into public.telegram_connections (owner_id, chat_id, username, first_name, last_name)
  values (link_row.owner_id, p_chat_id, p_username, p_first_name, p_last_name)
  on conflict (owner_id) do update set
    chat_id = excluded.chat_id,
    username = excluded.username,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    connected_at = now(),
    last_seen_at = now();

  return query select link_row.owner_id, true;
end;
$$;

revoke all on function public.consume_telegram_link_code(text, bigint, text, text, text) from public, anon, authenticated;
grant execute on function public.consume_telegram_link_code(text, bigint, text, text, text) to service_role;
