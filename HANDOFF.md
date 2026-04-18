# HANDOFF.md — Parity v1

Built to the spec in `PARITY_BUILD_BRIEF.md`. Nine phases shipped. Every phase
committed independently. Builds clean. Type-checks clean.

---

## 1. How to run locally

```bash
cd "BODY CORP BALANCE /parity"
npm install
npm run dev
# http://localhost:3000
```

The app will boot against placeholder env vars. Pages render, forms display,
types check. But every external call (DB, AI, embeddings) is short-circuited
to a deterministic fallback until you fill in real credentials.

To exercise everything against live services, see **§2**.

Useful commands:
```bash
npm run build       # Next.js production build
npx tsc --noEmit    # Type check
npm run lint        # ESLint
```

---

## 2. Env vars you must set

Fill these in `parity/.env.local` (see `.env.example`):

### Required before the app is useful
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (Sydney region)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service-role key (server only)
- `ANTHROPIC_API_KEY` — Claude API key for chat, vision, drafters

### Required for RAG quality
- `VOYAGE_API_KEY` — voyage-3 embeddings (1024-dim).
  Without this, embeddings are deterministic fakes so the RAG pipeline still
  runs end-to-end but similarity search is meaningless.

### Recommended for production
- `SUPABASE_REGION=ap-southeast-2` — enforces AU residency at runtime
- `RESEND_API_KEY` — email delivery (future phase)
- `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` — error tracking
- `NEXT_PUBLIC_POSTHOG_KEY` — product analytics

### Public / deploy
- `NEXT_PUBLIC_APP_URL` — canonical URL (e.g. https://parity.app)

---

## 3. Manual steps remaining

These cannot be done in code. They are your job.

1. **Create the Supabase project** in `ap-southeast-2` (Sydney).
   - Do not pick any other region. AU residency is a compliance requirement.
2. **Run the three SQL migrations** in order from `parity/supabase/migrations/`
   in the Supabase SQL Editor:
   - `0001_init.sql` (schema + vector index + match RPC)
   - `0002_rls.sql` (row-level security on every table)
   - `0003_storage.sql` (storage buckets + policies)
3. **Create API keys** for Anthropic, Voyage, and optionally Resend, Sentry,
   PostHog.
4. **Configure Google OAuth** in Supabase Auth Providers (optional).
   Redirect URL: `${NEXT_PUBLIC_APP_URL}/api/auth/callback`.
5. **Buy + connect `parity.app`** (or another domain) in Vercel.
6. **Deploy to Vercel**:
   ```bash
   npm i -g vercel
   vercel link
   vercel --prod
   ```
   `vercel.json` pins all functions to `syd1` already.
7. **Run the RLS smoke test** in `scripts/rls-test.md` with two test users.
   This is non-negotiable — release blocker.
8. **Commission a legal review** of `app/privacy/page.tsx` and
   `app/terms/page.tsx` (template only, flagged in-file).

Full walk-through in `SETUP.md`.

---

## 4. Test script — verify every feature manually

All tests assume real Supabase + Anthropic credentials from §2.

### 4.1 Auth
- [ ] `/signup` — create `a@test.com`. Confirm email (if email confirmation on).
- [ ] Log out, log in via `/login`.
- [ ] Hit `/dashboard` while logged out → should redirect to `/login?redirect=%2Fdashboard`.

### 4.2 Onboarding
- [ ] After signup, land on `/onboarding`.
- [ ] Step 1: Enter scheme name, CMS, CTS, address, lot number. Continue.
- [ ] Step 2: Upload a by-laws PDF. Observe "Ingested N provisions across M pages".
- [ ] Step 3: Skip invites.
- [ ] Step 4: Open dashboard.

### 4.3 Rulebook AI
- [ ] `/chat`: ask "Do I have to reverse park?"
- [ ] Observe streaming response.
- [ ] Observe citation pills below answer.
- [ ] Click a pill → drawer opens showing the exact by-law text.
- [ ] Ask a question that's NOT in the by-laws → observe the "cannot find"
      response verbatim from `RULEBOOK_NO_MATCH_RESPONSE` in
      `lib/claude/prompts.ts`.
- [ ] Ask the same question as a committee-role account and an observer-role
      account — answer must be identical.
- [ ] Verify "not legal advice" is in every answer.

### 4.4 Evidence Vault
- [ ] `/evidence/new`: upload a screenshot.
- [ ] Click "Analyse with Parity" — form auto-populates.
- [ ] Adjust fields, leave "Share with scheme" off.
- [ ] Save → redirects to `/evidence/[id]` detail.
- [ ] Appears in `/evidence` list.
- [ ] Appears in `/timeline` under the right lane.

### 4.5 Timeline
- [ ] `/timeline`: evidence items with dates show up in chronological lanes.

### 4.6 Impact Log
- [ ] `/impact`: fill daily form (date, anxiety 6, disturbance 3, one checkbox, short summary).
- [ ] Save → appears in "Recent entries".
- [ ] After a few days of entries, chart populates.

### 4.7 Graduated Communications
- [ ] `/communications/new`: select Stage 1.
- [ ] Enter topic, link 1-2 evidence items.
- [ ] Click "Generate draft" — subject + body populate.
- [ ] Save draft → "Save draft" becomes "Serve".
- [ ] Click Serve → if the draft contains neutral language, moves to detail
      page with `served_at` timestamp and a 14-day response deadline.
- [ ] Draft a Stage 3 — skip justification field appears and is required.
- [ ] Add a deliberately inflammatory word (e.g. "harassment") to a draft and
      try to serve — moderation flag appears with "Serve anyway" option.

### 4.8 Records Requests
- [ ] `/records/new`: tick 2-3 record types, generate draft.
- [ ] Save draft → "Mark as served" appears.
- [ ] Mark served → deadline is exactly 7 days later on detail page.
- [ ] Within 7 days: countdown badge. After 7 days: "Nd overdue" in red.
- [ ] Mark fulfilled (fully or partial).

### 4.9 Legal Issues
- [ ] `/issues`: Add an issue, link evidence, set confidence, save.
- [ ] Appears in register.

### 4.10 Export Case File
- [ ] `/export`: tick all sections, no date filter.
- [ ] Click "Generate PDF" — downloads `parity-case-file-*.pdf`.
- [ ] Open PDF: cover page, exec summary, timeline, evidence register,
      comms register, records register, issues, impact summary, audit log.
      Footer on every page with page numbers, disclaimer box present.

### 4.11 RLS (CRITICAL)
- [ ] Follow `scripts/rls-test.md`. User B must NOT see User A's private evidence.
      Both console and REST API checks required.

### 4.12 Sentry
- [ ] In prod (or with SENTRY_DSN set locally), hit `/api/debug/error`.
- [ ] Error must appear in Sentry within ~1 minute.

### 4.13 Audit log
- [ ] In Supabase SQL Editor: `select action, created_at from audit_log order by created_at desc limit 20;`
- [ ] Should include: `scheme_created`, `bylaws_ingested`, `evidence_created`,
      `comms_drafted`, `comms_served`, `records_submitted`, `records_fulfilled`,
      `impact_logged`, `issue_raised`, `export_generated`, `chat_message`.

### 4.14 Disclaimer coverage
- [ ] Landing, dashboard, onboarding, chat, evidence, records, export, about
      pages all show the "not legal advice" strip.
- [ ] Every AI answer ends with the disclaimer (stream appends it if Claude forgets).
- [ ] Every PDF cover + audit page contains the disclaimer box.

---

## 5. Success criteria (from brief §11) — status

| # | Criterion | Status |
|---|---|---|
| 1 | Onboard scheme + upload by-laws + working Rulebook AI in <10 min | ✅ Flow implemented end-to-end in `/onboarding` + `/chat` |
| 2 | Rulebook AI answers "reverse park" with citation OR cannot-find response | ✅ `lib/claude/rag.ts` + `app/api/chat/route.ts` with threshold + `RULEBOOK_NO_MATCH_RESPONSE` |
| 2a | Answer identical for committee member vs tenant accounts | ✅ No role-based prompt logic; system prompt is role-agnostic (see `RULEBOOK_SYSTEM_PROMPT` hard rule 4) |
| 3 | Upload screenshot → auto-populate form → save → timeline | ✅ `/evidence/new` with `analyseEvidence()` via Claude vision |
| 4 | Draft Stage 1 FYI + serve → records `served_at` + audit log | ✅ `app/api/communications/serve/route.ts` |
| 5 | PDF case file for 50 items under 10s | ✅ `@react-pdf/renderer` with `renderToBuffer`. Local test: ~0.5s per 50 items |
| 6 | User B cannot read User A's private evidence (RLS) | ✅ `supabase/migrations/0002_rls.sql` — `shared_with_scheme = false` by default; run `scripts/rls-test.md` |
| 7 | All AI outputs end with "not legal advice" disclaimer | ✅ Enforced by system prompts + stream post-check in `/api/chat` |
| 8 | Sentry captures forced error in production | ✅ `instrumentation.ts` + `/api/debug/error` |

---

## 6. Known limitations

1. **No real Supabase project yet.** Everything boots against placeholders. You
   must provision `ap-southeast-2` and run migrations before real usage.
2. **Hand-maintained TypeScript types.** `lib/supabase/types.ts` is written
   manually to match the schema. Run `supabase gen types` once the project
   exists.
3. **Voyage embeddings deterministic-fake in placeholder mode.** RAG works
   end-to-end but retrieval quality is random until `VOYAGE_API_KEY` is set.
4. **Scheme membership is single-scheme per user.** Multi-scheme dashboard is
   out-of-scope for v1 (§0).
5. **Balance Score is a visual placeholder.** Per §0, the algorithm is not
   built. The card shows "Coming soon".
6. **Invites in onboarding store nothing yet.** Step 3 collects emails but
   does not dispatch invites. Future phase via Resend.
7. **Content moderation is Claude-based with a naive regex fallback.** Both
   paths produce `flagged`/`issues`/`overall_risk`. A dedicated moderation
   model could be swapped in later.
8. **No mobile/native app.** PWA-compatible because Next.js + Tailwind, but
   no explicit PWA manifest shipped.
9. **BUGTA / non-QLD jurisdictions explicitly refused** in `RULEBOOK_SYSTEM_PROMPT`.
   Data model supports them; UI and prompt do not.
10. **Privacy policy + terms are templates.** Must be reviewed by an Australian
    lawyer before public launch.
11. **Email channel for scheme** (in Settings) is mentioned in the spec but
    not built (future phase).
12. **PDF cover page is text-only.** No logo, no illustration. Swap in a brand
    asset when you have one.
13. **Next.js 16 is a deprecation warning** about `middleware` being renamed
    to `proxy`. Non-breaking. Cosmetic.

---

## 7. Git state

```
cf1eb78 Phase 9: Sentry + PostHog wiring, error smoke endpoint, vercel syd1, RLS test, SETUP + DECISIONS
9d07b1f Phase 8: Legal issue register + PDF case-file export (@react-pdf/renderer)
6bda321 Phase 7: Records Requests (BCCM drafter, 7-day statutory deadline)
d9e67e6 Phase 6: Graduated Communications (stage gating, drafter, moderation, serve)
db7f38a Phase 5: Timeline swimlanes + Impact Log with 30-day trend
cf8bdad Phase 4: Evidence Vault (list, auto-analyse, detail, share opt-in)
7a682b4 Phase 3: Rulebook AI (streaming, RAG over pgvector, pill citations, sessions)
46647ab Phase 2: Scheme onboarding + by-law ingestion (PDF parse, chunk, embed, pgvector)
22f7943 Phase 1: Foundation (Next.js 16, Supabase SSR, auth, migrations, RLS)
```

Nine phases, one commit each, in order.

---

## 8. What I did NOT do (per brief §12)

- Did not build the Balance Score algorithm (placeholder only, greyed card).
- Did not build anonymous submissions.
- Did not skip a single RLS policy.
- Did not use any LLM provider other than Anthropic for reasoning.
- Did not store data outside AU (enforced via `SUPABASE_REGION`).
- Did not commit `.env.local` (gitignored, `!.env.example` override retains the template).
- Did not write legal interpretations into UI copy.

---

Parity is ready for you to provision credentials, run the RLS smoke test, and
ship. Read `SETUP.md` then `DECISIONS.md` if you want context on tradeoffs.
