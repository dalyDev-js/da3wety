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

Checks: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, `npm run test:e2e`.

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

Set the same environment variables in the Vercel project (Production and Preview). `vercel.json` schedules the gallery cleanup cron daily at 03:00 UTC; Vercel sends `Authorization: Bearer $CRON_SECRET`. Verify after deploy:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://da3wety.com/api/cron/cleanup-galleries
```

## Notes

- `npm audit` reports a moderate advisory in `esbuild` pulled in by `drizzle-kit`'s dev loader. It only affects the drizzle-kit dev process, never the deployed app.
- The `public/wasm` folder is generated at install time from `zxing-wasm` and is git-ignored.
