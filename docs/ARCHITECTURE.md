# BCC HUB DevRel OS — architecture

## Product shape

Single-user DevRel workspace. The app keeps context around projects, tasks, people, interactions, commitments, events, content, communities, ambassadors, Tech Radar, documents, decisions and knowledge cases.

## Routes / IA

Primary navigation: `/`, `/projects`, `/tasks`, `/people`, `/events`, `/content`, `/ambassadors`, `/communities`, `/tech-radar`, `/knowledge`.

Secondary navigation: `/analytics`, `/documents`, `/calendar`, `/settings`.

Every entity list has a detail route: `/<module>/<id>`. Global Quick Add and Ctrl/Cmd+K search are available from the App Shell.

## Runtime

- Next.js App Router + TypeScript.
- Tailwind CSS tokens are copied from `design.md`: white base, BCC violet, lilac/cyan accents, soft radius and restrained shadows.
- Supabase browser SDK is the cloud-first repository when both public env variables exist.
- When env is absent, local mode persists generic development seed data in localStorage so the app remains runnable for UI verification. This is a deliberate development fallback, not the production persistence path.
- `proxy.ts` protects routes when Supabase is configured. Registration is not exposed in the UI.
- PWA shell is served through `public/manifest.webmanifest` and `public/sw.js`.

## Data flow

`component -> TanStack Query -> lib/data.ts -> Supabase table + activity_log`.

Mutations add `owner_id`, timestamps and an Activity log entry. Important cross-entity links go through `entity_relations`; task hierarchy uses `tasks.parent_task_id`; comments use owner-scoped `entity_comments`. The UI does not rely on a visual-only relationship: the map is a projection of persisted edges and records.

## Decision rules

- Project Health is deterministic and explainable.
- Event readiness is based on registration progress and critical task checks.
- Ambassador XP is user-confirmed; no automatic reach multiplier and no fake AI.
- `listRecords` applies server-side filters, ranges and counts in cloud mode; local mode uses bounded pagination and normalized matching.
- Global search calls the Postgres `workspace_search` function when available and falls back to ranked bounded queries while a migration is pending.
- Task boards group in one pass through a `Map`; Meetup templates use one bulk insert; XP contribution uses one atomic Postgres function.
- Task details expose subtasks, all comments and work-log interactions. Active child statuses produce a deterministic readiness percentage: Done 100%, In Progress 50%, Waiting 25%, Planned 10%, and blocked/inbox 0%; cancelled children are excluded.
- The Connections tab loads persisted edges and task hierarchy into a bounded, clickable map with status and readiness on each node.
- URL parameters are the source of truth for list query state, so reload and shared links preserve the current view.
