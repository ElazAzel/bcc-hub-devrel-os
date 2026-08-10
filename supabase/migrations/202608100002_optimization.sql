-- Search and write-path optimizations for the production workspace.
-- Keep the simple text configuration: it works for Russian, English and product names.

alter table public.projects add column if not exists search_document tsvector generated always as (
  to_tsvector('simple', concat_ws(' ', title, description, direction, goal, next_action))
) stored;
alter table public.tasks add column if not exists search_document tsvector generated always as (
  to_tsvector('simple', concat_ws(' ', title, description, context, source_label, next_action))
) stored;
alter table public.contacts add column if not exists search_document tsvector generated always as (
  to_tsvector('simple', concat_ws(' ', name, first_name, last_name, position, organization_name, email, notes))
) stored;
alter table public.organizations add column if not exists search_document tsvector generated always as (
  to_tsvector('simple', concat_ws(' ', name, type, website, description, city, notes))
) stored;
alter table public.interactions add column if not exists search_document tsvector generated always as (
  to_tsvector('simple', concat_ws(' ', title, topic, summary, decision, next_action))
) stored;
alter table public.commitments add column if not exists search_document tsvector generated always as (
  to_tsvector('simple', concat_ws(' ', title, description, owed_by))
) stored;
alter table public.events add column if not exists search_document tsvector generated always as (
  to_tsvector('simple', concat_ws(' ', title, type, location, format, audience))
) stored;
alter table public.content_items add column if not exists search_document tsvector generated always as (
  to_tsvector('simple', concat_ws(' ', title, content_type, channel, status, description))
) stored;
alter table public.communities add column if not exists search_document tsvector generated always as (
  to_tsvector('simple', concat_ws(' ', name, description, status))
) stored;
alter table public.ambassadors add column if not exists search_document tsvector generated always as (
  to_tsvector('simple', concat_ws(' ', name, track, level, status, notes))
) stored;
alter table public.tech_radar_items add column if not exists search_document tsvector generated always as (
  to_tsvector('simple', concat_ws(' ', name, slug, domain, category, ring, description, recommendation, rationale, version))
) stored;
alter table public.documents add column if not exists search_document tsvector generated always as (
  to_tsvector('simple', concat_ws(' ', title, type, location_type, description, external_url))
) stored;
alter table public.decisions add column if not exists search_document tsvector generated always as (
  to_tsvector('simple', concat_ws(' ', title, context, problem, options, decision, reason, consequences))
) stored;
alter table public.knowledge_cases add column if not exists search_document tsvector generated always as (
  to_tsvector('simple', concat_ws(' ', title, situation, problem, trigger, actions, result, reusable_solution))
) stored;

create index if not exists projects_search_document_idx on public.projects using gin(search_document) where archived_at is null;
create index if not exists tasks_search_document_idx on public.tasks using gin(search_document) where archived_at is null;
create index if not exists contacts_search_document_idx on public.contacts using gin(search_document) where archived_at is null;
create index if not exists organizations_search_document_idx on public.organizations using gin(search_document) where archived_at is null;
create index if not exists interactions_search_document_idx on public.interactions using gin(search_document) where archived_at is null;
create index if not exists commitments_search_document_idx on public.commitments using gin(search_document) where archived_at is null;
create index if not exists events_search_document_idx on public.events using gin(search_document) where archived_at is null;
create index if not exists content_items_search_document_idx on public.content_items using gin(search_document) where archived_at is null;
create index if not exists communities_search_document_idx on public.communities using gin(search_document) where archived_at is null;
create index if not exists ambassadors_search_document_idx on public.ambassadors using gin(search_document) where archived_at is null;
create index if not exists tech_radar_items_search_document_idx on public.tech_radar_items using gin(search_document) where archived_at is null;
create index if not exists documents_search_document_idx on public.documents using gin(search_document) where archived_at is null;
create index if not exists decisions_search_document_idx on public.decisions using gin(search_document) where archived_at is null;
create index if not exists knowledge_cases_search_document_idx on public.knowledge_cases using gin(search_document) where archived_at is null;

create or replace function public.workspace_search(search_text text, result_limit integer default 40)
returns table(module text, id uuid, title text, subtitle text, rank real)
language sql stable security invoker set search_path = public
as $$
  with query as (select websearch_to_tsquery('simple', nullif(trim(search_text), '')) as document), results as (
    select 'projects'::text as module, p.id, p.title, coalesce(p.description, p.direction) as subtitle, ts_rank(p.search_document, query.document) as rank from public.projects p, query where p.owner_id = auth.uid() and p.archived_at is null and query.document @@ p.search_document
    union all select 'tasks', t.id, t.title, coalesce(t.description, t.context) as subtitle, ts_rank(t.search_document, query.document) from public.tasks t, query where t.owner_id = auth.uid() and t.archived_at is null and query.document @@ t.search_document
    union all select 'people', c.id, coalesce(nullif(c.name, ''), trim(concat_ws(' ', c.first_name, c.last_name))), coalesce(c.position, c.organization_name), ts_rank(c.search_document, query.document) from public.contacts c, query where c.owner_id = auth.uid() and c.archived_at is null and query.document @@ c.search_document
    union all select 'organizations', o.id, o.name, coalesce(o.description, o.type), ts_rank(o.search_document, query.document) from public.organizations o, query where o.owner_id = auth.uid() and o.archived_at is null and query.document @@ o.search_document
    union all select 'interactions', i.id, i.title, coalesce(i.summary, i.topic), ts_rank(i.search_document, query.document) from public.interactions i, query where i.owner_id = auth.uid() and i.archived_at is null and query.document @@ i.search_document
    union all select 'commitments', c.id, c.title, c.description, ts_rank(c.search_document, query.document) from public.commitments c, query where c.owner_id = auth.uid() and c.archived_at is null and query.document @@ c.search_document
    union all select 'events', e.id, e.title, coalesce(e.location, e.audience), ts_rank(e.search_document, query.document) from public.events e, query where e.owner_id = auth.uid() and e.archived_at is null and query.document @@ e.search_document
    union all select 'content', c.id, c.title, coalesce(c.channel, c.content_type), ts_rank(c.search_document, query.document) from public.content_items c, query where c.owner_id = auth.uid() and c.archived_at is null and query.document @@ c.search_document
    union all select 'communities', c.id, c.name, c.description, ts_rank(c.search_document, query.document) from public.communities c, query where c.owner_id = auth.uid() and c.archived_at is null and query.document @@ c.search_document
    union all select 'ambassadors', a.id, a.name, coalesce(a.track, a.level), ts_rank(a.search_document, query.document) from public.ambassadors a, query where a.owner_id = auth.uid() and a.archived_at is null and query.document @@ a.search_document
    union all select 'tech-radar', r.id, r.name, coalesce(r.category, r.ring), ts_rank(r.search_document, query.document) from public.tech_radar_items r, query where r.owner_id = auth.uid() and r.archived_at is null and query.document @@ r.search_document
    union all select 'documents', d.id, d.title, coalesce(d.type, d.location_type), ts_rank(d.search_document, query.document) from public.documents d, query where d.owner_id = auth.uid() and d.archived_at is null and query.document @@ d.search_document
    union all select 'decisions', d.id, d.title, d.context, ts_rank(d.search_document, query.document) from public.decisions d, query where d.owner_id = auth.uid() and d.archived_at is null and query.document @@ d.search_document
    union all select 'knowledge', k.id, k.title, coalesce(k.situation, k.result), ts_rank(k.search_document, query.document) from public.knowledge_cases k, query where k.owner_id = auth.uid() and k.archived_at is null and query.document @@ k.search_document
  ) select results.module, results.id, results.title, results.subtitle, results.rank from results order by results.rank desc, results.title asc limit greatest(1, least(result_limit, 100));
$$;

revoke execute on function public.workspace_search(text, integer) from public;
grant execute on function public.workspace_search(text, integer) to authenticated;

create or replace function public.apply_ambassador_contribution(
  p_ambassador_id uuid,
  p_type text,
  p_base_xp integer,
  p_multiplier numeric default 1,
  p_final_xp integer default 0,
  p_date date default current_date,
  p_status text default 'Approved',
  p_review_note text default null
) returns void
language plpgsql security invoker set search_path = public
as $$
declare current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Нужна авторизация'; end if;
  insert into public.ambassador_contributions(owner_id, ambassador_id, type, base_xp, multiplier, final_xp, date, status, review_note)
  values (current_user_id, p_ambassador_id, p_type, p_base_xp, coalesce(p_multiplier, 1), p_final_xp, coalesce(p_date, current_date), coalesce(p_status, 'Approved'), p_review_note);
  update public.ambassadors a set total_xp = coalesce((select sum(c.final_xp) from public.ambassador_contributions c where c.owner_id = current_user_id and c.ambassador_id = p_ambassador_id and c.status = 'Approved'), 0), current_quarter_xp = coalesce((select sum(c.final_xp) from public.ambassador_contributions c where c.owner_id = current_user_id and c.ambassador_id = p_ambassador_id and c.status = 'Approved' and c.date >= date_trunc('quarter', current_date)::date), 0), last_contribution_at = now(), updated_at = now() where a.id = p_ambassador_id and a.owner_id = current_user_id;
  if not found then raise exception 'Амбассадор не найден'; end if;
end;
$$;

revoke execute on function public.apply_ambassador_contribution(uuid, text, integer, numeric, integer, date, text, text) from public;
grant execute on function public.apply_ambassador_contribution(uuid, text, integer, numeric, integer, date, text, text) to authenticated;
