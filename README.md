# Da3wety (دعوتي)

Digital invitations and events platform for the Egyptian market. Hosts create an event page, share a digital invitation, collect RSVPs, run a temporary shared photo gallery (Standard tier) and QR check-in at the door (Premium tier).

## Stack

Next.js 16 App Router (single app on Vercel) · Supabase (Postgres, Auth with Google, Storage) · Drizzle ORM · Tailwind CSS v4 + shadcn/ui (Radix, RTL) · zod v4 · motion · next-intl (Arabic-first, bilingual).

## Local setup

```bash
npm install                 # also copies the QR scanner wasm into public/wasm
cp .env.example .env.local  # then fill in the values below
npm run db:migrate          # creates tables, RLS policies, triggers and storage buckets
npm run db:seed             # inserts the package tiers
npm run dev                 # http://localhost:3000
```

Either point `.env.local` at the hosted `da3wety-dev` project (checklist below) or run the Supabase CLI stack locally (`supabase start`, then use the URL/keys/connection strings it prints; `supabase/config.toml` is committed). For local development without Google OAuth, set `DEV_LOGIN_ENABLED=true` and create a password host:

```bash
node --env-file=.env.local scripts/create-dev-host.mjs            # admin@local.test / local-dev-password
node --env-file=.env.local scripts/create-dev-host.mjs me@x.test pw # custom credentials
```

Then sign in at `/login` with the dev-login form. Add the email to `ADMIN_EMAILS` to reach `/admin`.

Checks: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`. The PostgREST RLS integration test (`tests/integration`) is skipped unless you run it against a real project: `RUN_INTEGRATION=1 node --env-file=.env.local node_modules/vitest/vitest.mjs run tests/integration`.

## Supabase setup checklist

Create two projects, `da3wety-dev` and `da3wety-prod` (region `eu-central-1`, Frankfurt). Repeat the steps for each; step 6 is dev-only.

1. **Keys**: Settings → API keys (new key system). Copy the Project URL, the publishable key (`sb_publishable_…`) and the secret key (`sb_secret_…`) into `.env.local`.
2. **Connection strings**: Connect → copy the **transaction** pooler URL (port 6543) into `DATABASE_URL` and the **session** pooler URL (port 5432) into `DATABASE_MIGRATION_URL`.
3. **JWT signing key**: Authentication → JWT Signing Keys → switch to an asymmetric key (ECC P-256) so sessions are verified locally.
4. **Google OAuth**: in Google Cloud Console create a Web OAuth client with JavaScript origins `http://localhost:3000` and `https://da3wety.com`, and the redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`. Paste the client id/secret into Authentication → Providers → Google and enable it.
5. **URL configuration**: Authentication → URL Configuration → Site URL `https://da3wety.com`; Redirect URLs: `http://localhost:3000/**`, `https://da3wety.com/auth/callback`, `https://*-<vercel-team>.vercel.app/**`.
6. **Dev only**: Authentication → Providers → Email → enable (used by the local dev-login route and Playwright). Keep it disabled on prod.
7. Run `npm run db:migrate` then `npm run db:seed`.
8. Before the first live event: upgrade the prod project to Pro (Free projects pause after a week of inactivity and cap storage at 1 GB).

If the migration cannot insert into `storage.buckets` (permissions differ between projects), create the buckets in the dashboard: `event-assets` (public, 5 MB, image/jpeg,image/png,image/webp) and `event-photos` (private, 3 MB, same MIME types).

## Environment variables

See `.env.example`. `SUPABASE_SECRET_KEY`, `DATABASE_URL`, `CRON_SECRET`, `ADMIN_EMAILS` and `DEV_LOGIN_ENABLED` are server-only. `ADMIN_EMAILS` is a comma-separated list of Google accounts that become admins on first login.

## Vercel

1. Import the repo as a Vercel project (framework: Next.js, build `npm run build`). Node 20+.
2. Environment variables (Production → prod Supabase project, Preview → dev project): every key in `.env.example`. `NEXT_PUBLIC_SITE_URL` must be `https://da3wety.com` in Production (it is baked into QR payloads and share links). Keep `DEV_LOGIN_ENABLED` unset/`false` in Production; the route also refuses to run when `NODE_ENV=production`.
3. `CRON_SECRET`: Vercel calls `/api/cron/cleanup-galleries` daily at 03:00 UTC (`vercel.json`) with `Authorization: Bearer $CRON_SECRET`. The route fails closed (401) without it. Verify after the first deploy:

   ```bash
   curl -H "Authorization: Bearer $CRON_SECRET" https://da3wety.com/api/cron/cleanup-galleries
   # {"ok":true,"claimed":0,"purged":0,"objectsRemoved":0,"rowsDeleted":0,"staleReservations":0,"errors":0}
   ```

4. Domain: add `da3wety.com` (and `www` → redirect). Then update the Supabase prod project: Auth → URL Configuration (Site URL + redirect URLs) and the Google OAuth client's authorized origins.
5. Cron on the Hobby plan runs once a day at best-effort times; that is fine for gallery cleanup. Pro gives exact schedules.

## Launch checklist

- [ ] Prod Supabase project created, migrated and seeded; Email provider **disabled**; JWT signing key asymmetric; Pro plan before the first live event.
- [ ] Google OAuth round-trip on `https://da3wety.com/login` with a real account; that account listed in `ADMIN_EMAILS` and `/admin` reachable.
- [ ] Cron `curl` above returns `ok:true` on production.
- [ ] Share preview: paste an `/e/<slug>` link into WhatsApp and the [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/); the OG image should show the cover photo and the honoree names.
- [ ] Device pass over HTTPS: envelope animation on one iPhone (Safari) and one Android (Chrome); camera scanning at `/scan/<token>` on both (iOS needs the "start camera" tap); reduced-motion setting skips the animation.
- [ ] Lighthouse (mobile) on a published `/e/<slug>`: accessibility, best practices and SEO at 100. Performance is bounded by the two Arabic font families (~300 KB) plus React; see Notes.

## Notes

- `npm audit` reports a moderate advisory in `esbuild` pulled in by `drizzle-kit`'s dev loader. It only affects the drizzle-kit dev process, never the deployed app.
- The `public/wasm` folder is generated at install time from `zxing-wasm` and is git-ignored.
- Client components must not import anything under `src/lib/validation/` except `state.ts` (ESLint enforces it): zod is ~390 KB and belongs in server actions only. Pure phone helpers for the client live in `src/lib/phone.ts`.
- Invitation-page performance: the guest bundle is ~215 KB gzipped of JS (React, motion, next-intl) plus ~300 KB of fonts (Cairo variable; Amiri 400 + 700, Arabic + Latin). Dropping Amiri 700 (use `font-normal` on the invitation `h1`) saves ~100 KB if the heading weight is acceptable.
# da3wety
