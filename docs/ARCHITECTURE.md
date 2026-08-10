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
- Middleware protects routes when Supabase is configured. Registration is not exposed in the UI.
- PWA shell is served through `public/manifest.webmanifest` and `public/sw.js`.

## Data flow

`component -> lib/data.ts -> Supabase table + activity_log`.

Mutations add `owner_id`, timestamps and an Activity log entry. Important cross-entity links go through `entity_relations`; the UI does not rely on a visual-only relationship.

## Decision rules

- Project Health is deterministic and explainable.
- Event readiness is based on registration progress and critical task checks.
- Ambassador XP is user-confirmed; no automatic reach multiplier and no fake AI.
- Search uses Postgres-backed list queries in cloud mode and the same indexed records in local mode.
