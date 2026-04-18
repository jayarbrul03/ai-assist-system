# SETUP.md — Things Matty needs to do before this runs against real data

Everything below is wired in code. Placeholders let the app build + boot
without credentials; real values switch to live behaviour at the call-site.

## 1. Create Supabase project in Sydney (AU residency is mandatory)

1. Go to https://supabase.com/dashboard
2. New project → **Region: Southeast Asia (Sydney) — `ap-southeast-2`**.
   **Do not pick any other region.** The code checks `SUPABASE_REGION` and
   fails in prod if it is set to anything else.
3. Save the project URL, anon key, and service-role key.

## 2. Run database migrations

In the Supabase SQL Editor, execute in this order:

1. `parity/supabase/migrations/0001_init.sql` — schema, enums, vector index, RPC
2. `parity/supabase/migrations/0002_rls.sql` — row-level security policies
3. `parity/supabase/migrations/0003_storage.sql` — storage buckets + storage RLS

Verify:
- `\d+ evidence_items` shows RLS enabled.
- `select * from pg_policies where tablename='evidence_items';` lists 4 policies.

## 3. Regenerate TypeScript types from the live DB (optional but recommended)

```bash
npm i -D supabase
npx supabase login
npx supabase gen types typescript --project-id <your-project-ref> > lib/supabase/types.ts
```

## 4. Fill in `.env.local`

Copy `.env.example` → `.env.local` and fill:

| Variable | Get from | Required? |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Your domain (http://localhost:3000 for dev) | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project settings → API | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project settings → API | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project settings → API | Yes |
| `SUPABASE_REGION` | Set to `ap-southeast-2` | Recommended |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com | Yes |
| `VOYAGE_API_KEY` | https://www.voyageai.com | Yes for real RAG |
| `RESEND_API_KEY` | https://resend.com | Only if emailing notifications |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | https://sentry.io | For error tracking in prod |
| `NEXT_PUBLIC_POSTHOG_KEY` | https://posthog.com | For product analytics |

## 5. Enable Google OAuth (optional)

Supabase Dashboard → Authentication → Providers → Google. Add your client ID
and secret. Redirect URL: `${NEXT_PUBLIC_APP_URL}/api/auth/callback`.

## 6. Run locally

```bash
cd parity
npm install
npm run dev
# open http://localhost:3000
```

## 7. Deploy to Vercel (Sydney edge)

```bash
npm i -g vercel
vercel link
vercel --prod
```

`vercel.json` pins functions to the Sydney region (`syd1`). Add every env var
from step 4 in Vercel Project Settings → Environment Variables. Redeploy.

## 8. Verify Sentry + RLS

- Hit `https://<your-domain>/api/debug/error` — Sentry should capture the
  forced error.
- Follow `scripts/rls-test.md` to verify User B cannot read User A's private
  evidence.

## 9. Domain

Point `parity.app` (or whichever domain) at Vercel. Add it to the project in
Vercel → Domains and wait for the ACME SSL cert.
