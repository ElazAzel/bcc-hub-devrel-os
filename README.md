# BCC HUB DevRel OS

Personal, cloud-first DevRel operating system for keeping projects, tasks, people, events, content, decisions and professional memory in context.

## Local setup

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3004` for the local production smoke, or use the port printed by `npm run dev`. The deployed production app is available at `https://bcc-hub-devrel-os.vercel.app`.

## Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_DATA_MODE=

# Telegram integration — server-only Vercel variables
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
SUPABASE_ADMIN_KEY=
```

Supabase is the production source of truth. Without env variables, the clearly marked local mode uses generic seed data and local persistence only for development.

To force local mode while keeping Supabase credentials in `.env.local`, set `NEXT_PUBLIC_DATA_MODE=local` for both build and start. Leave it empty in Preview and Production.

## Supabase setup

Apply migrations in filename order: `202608100001_initial.sql`, `202608100002_optimization.sql`, `202608110003_telegram_integration.sql`, `202608110004_fix_telegram_link_code.sql`, `202608110005_fix_telegram_link_code_return.sql`, `202608130001_comments_relationships.sql`, `202608130002_contact_directory.sql`, `202608130003_entity_hierarchy.sql`, `202608130004_sync_entity_hierarchy.sql`, `202608140001_task_schedule.sql`, `202608140002_planning_and_mentions.sql`, then `202608140003_schedule_hierarchy.sql`. For the linked project use `supabase login`, `supabase link --project-ref njedalwewcsmsitrbwej`, then `supabase db push`. The optimization migration adds full-text search indexes, `workspace_search` and atomic `apply_ambassador_contribution`; the latest migrations add the secure employee directory, contact links, the canonical project/event/task/note hierarchy with database-side synchronization, task scheduling fields, shared planning periods and task timing explanations, and automatic parent-period expansion from child tasks to projects. Create an email/password user in Supabase Auth, then add the public URL and publishable key to `.env.local` and Vercel. Public registration is intentionally not exposed in the app.

## Telegram assistant

Migration `202608110003_telegram_integration.sql` adds one-time chat linking, RLS-protected connection records and idempotent webhook updates. Add `TELEGRAM_BOT_TOKEN`, a random `TELEGRAM_WEBHOOK_SECRET` and the server-only Supabase admin key as Vercel Production variables. The admin key is used only inside the server webhook route and must never have the `NEXT_PUBLIC_` prefix.

After deploying, configure the webhook from a machine with the new bot token:

```bash
APP_URL=https://bcc-hub-devrel-os.vercel.app npm run telegram:setup
```

Команда также обновляет встроенное меню Telegram через `setMyCommands`. Описания команд отправляются как UTF-8, поэтому кириллица не превращается в `????`.

Then open **Настройки → Telegram-ассистент**, create a code and send `/start КОД` to `@DevRelAssistbot`. Available commands: `/contexts`, `/task ID_ПРОЕКТА_ИЛИ_СОБЫТИЯ | текст`, `/note ID_ЗАДАЧИ | текст`, `/tasks`, `/today`, `/done`, `/help`. The webhook accepts only Telegram requests with the configured secret header. Revoke any previously exposed bot token through BotFather before adding the replacement.

## Commands

```bash
npm run dev
npm run typecheck
npm run lint
npm run build
npm run start
npm test
npm run test:e2e
```

## Features

- Responsive App Shell with desktop sidebar, tablet overlay and mobile bottom navigation.
- Global Quick Add, Ctrl/Cmd+K command palette and keyboard shortcuts.
- CRUD lists and detail routes for core DevRel entities.
- Deterministic Project Health, Event Readiness, XP ledger confirmation and Tech Radar rings.
- Cross-entity relations and Activity log.
- Calendar aggregation and decision-support analytics.
- PWA manifest, maskable icon, service worker and offline indicator.
- URL-persistent search, filters, pagination and list/board/radar views.
- Russian interface with stable English enum values in storage.
- Radix Dialog focus management, reduced-motion support and 44px touch targets.

## Docs

- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT.md`
- `design.md`
- `BCC_HUB_DEVREL_OS_VIBECODING_PROMPT.md`
