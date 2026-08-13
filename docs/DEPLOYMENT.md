# Deployment

## Local

```bash
npm install
copy .env.example .env.local
npm run dev
```

Production smoke locally (без cloud Auth, для проверки UI и local persistence):

```bash
npm run typecheck && npm run lint && npm test && npm run build
npm run start -- -p 3004
```

Without Supabase variables the UI runs in local development mode. If credentials are present, set `NEXT_PUBLIC_DATA_MODE=local` for both build and start to force the fallback safely. Leave this variable empty in Vercel. Для cloud-режима локальная Supabase-схема должна быть применена.

## Supabase + Vercel

1. Project ref: `njedalwewcsmsitrbwej`.
2. Authenticate the Supabase CLI: `supabase login`.
3. Link and apply all migrations in filename order:

   ```bash
   supabase link --project-ref njedalwewcsmsitrbwej
   supabase db push
   ```

4. Create the single email/password user in Supabase Auth.
5. The Vercel project `bcc-hub-devrel-os` is linked to GitHub with `main` as Production Branch. Preview and Production already contain `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
6. Verify login, project/task/contact CRUD, relations, activity, reload persistence and a second device on desktop and mobile.

## GitHub workflow

Pull requests should run `.github/workflows/ci.yml`. Keep Supabase and Vercel credentials outside git; `.vercel/` remains ignored.

Production: `https://bcc-hub-devrel-os.vercel.app`
