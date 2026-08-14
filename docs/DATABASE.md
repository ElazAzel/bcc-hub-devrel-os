# Database

The canonical schema lives in `supabase/migrations/202608100001_initial.sql`, the optimization layer in `202608100002_optimization.sql`, the relationship/comment layer in `202608130001_comments_relationships.sql`, the contact directory layer in `202608130002_contact_directory.sql`, and the hierarchy layers in `202608130003_entity_hierarchy.sql` and `202608130004_sync_entity_hierarchy.sql`. It uses UUID primary keys, `owner_id`, timestamps, soft-delete `archived_at` where applicable, indexes for frequent filters, and RLS policies based on `auth.uid() = owner_id`.

## Setup

1. Create one Supabase project.
2. Apply all migrations with `supabase db push` or the Supabase SQL editor.
3. Create one email/password user in Supabase Auth.
4. Add the project URL and publishable key to `.env.local` and Vercel.
5. Optionally run `supabase/seed.sql` in a development project after replacing `YOUR_USER_UUID`.

## Core tables

`projects`, `tasks`, `contacts`, `organizations`, `interactions`, `commitments`, `events`, `content_items`, `communities`, `ambassadors`, `ambassador_contributions`, `ambassador_training`, `tech_radar_items`, `tech_radar_versions`, `documents`, `decisions`, `knowledge_cases`, `kpis`, `entity_relations`, `entity_parent_links`, `entity_comments`, `entity_contact_links`, `tags`, `entity_tags`, `activity_log`, `templates`, `saved_views`.

## RLS

All tables are enabled for row-level security. Select/insert/update/delete policies require the authenticated owner UUID. Do not use a service role key in browser code.

## Backup / export

Use the Supabase dashboard or `supabase db dump` from an authenticated development environment. Never commit `.env`, secrets or a sensitive local dump.

## Optimization migration

`202608100002_optimization.sql` adds generated `tsvector` documents with GIN indexes for searchable modules, a bounded `workspace_search` function for cross-module search, and `apply_ambassador_contribution` for an atomic ledger and totals update. Both functions retain owner checks through RLS.

`202608130001_comments_relationships.sql` adds owner-scoped comments, indexes both directions of the relationship graph, and indexes `tasks.parent_task_id`. Subtasks use the existing `parent_task_id` field; readiness is calculated in one pass from active child statuses, with cancelled children excluded.

`202608130002_contact_directory.sql` adds `contacts.contact_kind` and owner-scoped `entity_contact_links`, then backfills existing interaction participants. The generic link table is used by the contact picker and relationship map for tasks, projects, events, interactions and other records.

`202608130003_entity_hierarchy.sql` adds missing context columns, creates the owner-scoped `entity_parent_links` table with one direct parent per child, backfills existing project/event/task/note context, and adds RLS. The application validates allowed parent types and rejects cycles before saving. The table is the canonical tree; direct context columns are kept for fast list filters and dashboard aggregates.

`202608130004_sync_entity_hierarchy.sql` adds a database trigger for projects, events, tasks, interactions, commitments, content, documents, decisions and notes. It keeps the canonical parent link synchronized for server-side writes such as Telegram, including when a record is moved or detached.

`202608140001_task_schedule.sql` adds optional task scheduling fields: start/end time, meeting mode, online meeting URL and offline location. The meeting mode constraint accepts `online` or `offline`; all fields are nullable so existing tasks remain valid.
