-- Development seed is intentionally generic. Run only in a development project after creating a user.
-- Replace YOUR_USER_UUID with the authenticated user's id.
-- The application also has a local development seed when Supabase env is not configured.
insert into public.projects (owner_id, title, description, direction, status, priority, due_date, next_action, health_score, health_state)
values ('YOUR_USER_UUID', 'BCC HUB DevRel Strategy 2026', 'Единый портфель DevRel-направлений.', 'Operations', 'Active', 'High', '2026-12-31', 'Собрать список целей Q3', 84, 'Attention');

insert into public.tech_radar_items (owner_id, name, domain, category, ring, change_state, description, recommendation, version, last_reviewed_at)
values ('YOUR_USER_UUID', 'OpenAPI / Swagger', 'Backend', 'Технологии', 'Adopt', 'Recently Changed', 'Контрактный подход к API-дизайну.', 'Использовать для новых API.', '3.1', '2026-08-05');
