# BCC HUB DevRel OS

Personal, cloud-first DevRel operating system for keeping projects, tasks, people, events, content, decisions and professional memory in context.

## Local setup

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Supabase is the production source of truth. Without env variables, local development mode uses generic seed data and local persistence only to verify the interface.

## Supabase setup

Apply `supabase/migrations/202608100001_initial.sql`, create an email/password user in Supabase Auth, then add the public URL and publishable key to `.env.local` and Vercel. Public registration is intentionally not exposed in the app.

## Commands

```bash
npm run dev
npm run typecheck
npm run lint
npm run build
npm run start
```

## Features

- Responsive App Shell with desktop sidebar, tablet overlay and mobile bottom navigation.
- Global Quick Add, Ctrl/Cmd+K command palette and keyboard shortcuts.
- CRUD lists and detail routes for core DevRel entities.
- Deterministic Project Health, Event Readiness, XP ledger confirmation and Tech Radar rings.
- Cross-entity relations and Activity log.
- Calendar aggregation and decision-support analytics.
- PWA manifest, maskable icon, service worker and offline indicator.

## Docs

- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/DEPLOYMENT.md`
- `design.md`
- `BCC_HUB_DEVREL_OS_VIBECODING_PROMPT.md`
