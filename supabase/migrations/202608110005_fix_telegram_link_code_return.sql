drop function if exists public.consume_telegram_link_code(text, bigint, text, text, text);

create function public.consume_telegram_link_code(
  p_code_hash text,
  p_chat_id bigint,
  p_username text default null,
  p_first_name text default null,
  p_last_name text default null
)
returns table(result_owner_id uuid, connected boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  link_row public.telegram_link_codes%rowtype;
begin
  select tlc.* into link_row
  from public.telegram_link_codes as tlc
  where tlc.code_hash = p_code_hash
    and tlc.used_at is null
    and tlc.expires_at > now()
  for update;

  if not found then
    return;
  end if;

  if exists (
    select 1
    from public.telegram_connections as tc
    where tc.chat_id = p_chat_id
      and tc.owner_id <> link_row.owner_id
  ) then
    return;
  end if;

  update public.telegram_link_codes as tlc
  set used_at = now()
  where tlc.id = link_row.id;

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
