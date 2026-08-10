# Database

The canonical schema lives in `supabase/migrations/202608100001_initial.sql`. It uses UUID primary keys, `owner_id`, timestamps, soft-delete `archived_at` where applicable, indexes for frequent filters, and RLS policies based on `auth.uid() = owner_id`.

## Setup

1. Create one Supabase project.
2. Apply the migration with `supabase db push` or the Supabase SQL editor.
3. Create one email/password user in Supabase Auth.
4. Add the project URL and publishable key to `.env.local` and Vercel.
5. Optionally run `supabase/seed.sql` in a development project after replacing `YOUR_USER_UUID`.

## Core tables

`projects`, `tasks`, `contacts`, `organizations`, `interactions`, `commitments`, `events`, `content_items`, `communities`, `ambassadors`, `ambassador_contributions`, `ambassador_training`, `tech_radar_items`, `tech_radar_versions`, `documents`, `decisions`, `knowledge_cases`, `kpis`, `entity_relations`, `tags`, `entity_tags`, `activity_log`, `templates`, `saved_views`.

## RLS

All tables are enabled for row-level security. Select/insert/update/delete policies require the authenticated owner UUID. Do not use a service role key in browser code.

## Backup / export

Use the Supabase dashboard or `supabase db dump` from an authenticated development environment. Never commit `.env`, secrets or a sensitive local dump.
