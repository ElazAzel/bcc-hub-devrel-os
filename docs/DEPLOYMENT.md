# Deployment

## Local

```bash
npm install
copy .env.example .env.local
npm run dev
```

Without Supabase variables the UI runs in local development mode. For a real workspace, configure Supabase before using it.

## Supabase + Vercel

1. Create the Supabase project and apply `supabase/migrations/202608100001_initial.sql`.
2. Create the single email/password user in Supabase Auth.
3. Import the repository into Vercel as a Next.js app.
4. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Preview and Production.
5. Deploy and verify login, project/task/contact CRUD, relations, activity and reload persistence on desktop and mobile.

No production URL or GitHub remote is claimed by this repository until credentials are supplied and the deploy is actually verified.
