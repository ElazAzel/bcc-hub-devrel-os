# Deployment

## Local

```bash
npm install
copy .env.example .env.local
npm run dev
```

Production smoke locally:

```bash
npm run typecheck && npm run lint && npm test && npm run build
npm run start -- -p 3004
```

Without Supabase variables the UI runs in local development mode. For a real workspace, configure Supabase before using it.

## Supabase + Vercel

1. Create the Supabase project and apply both migrations in `supabase/migrations/` in filename order.
2. Create the single email/password user in Supabase Auth.
3. Link the repository to the existing Vercel project `bcc-hub-devrel-os`.
4. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Preview and Production.
5. Deploy a branch preview, then promote to Production only after the checks pass.
6. Verify login, project/task/contact CRUD, relations, activity, reload persistence and a second device on desktop and mobile.

## GitHub workflow

Pull requests should run `.github/workflows/ci.yml`. Keep Supabase and Vercel credentials outside git; `.vercel/` remains ignored.

No production URL or GitHub remote is claimed by this repository until credentials are supplied and the deploy is actually verified.
