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
```

Supabase is the production source of truth. Without env variables, the clearly marked local mode uses generic seed data and local persistence only for development.

## Supabase setup

Apply both migrations in order: `202608100001_initial.sql`, then `202608100002_optimization.sql`. For the linked project use `supabase login`, `supabase link --project-ref njedalwewcsmsitrbwej`, then `supabase db push`. The second migration adds full-text search indexes, `workspace_search` and atomic `apply_ambassador_contribution`. Create an email/password user in Supabase Auth, then add the public URL and publishable key to `.env.local` and Vercel. Public registration is intentionally not exposed in the app.

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
