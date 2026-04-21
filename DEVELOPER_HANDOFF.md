# DEVELOPER HANDOFF — Parity

**Status:** Testable MVP complete. Ready for production wiring + remaining features.
**Handed off:** v0.1.0
**Target runtime:** Node 20+, Next.js 16 App Router, Supabase, Vercel (Sydney edge).

---

## 1. What Parity is

**Consumer brand:** Parity
**Parent entity:** StrataBalance Pty Ltd
**Tagline:** *Balance for strata. Clarity for everyone.*

Parity is a neutral AI-first governance, communication and accountability layer that sits between **body corporate committees, body corporate managers, lot owners, and tenants** in Australian strata schemes — starting with Queensland (BCCM Act 1997).

**The mission is education + communication first. Case-file / evidence holding is secondary — available when disputes escalate, but not the front door.**

### The four-sided product

| Role | Primary value |
|---|---|
| **Lot owner** | Understand by-laws. Communicate calmly. Keep a private record, only if needed. |
| **Tenant** | Know your standing. Raise concerns through your landlord-owner. Document treatment. |
| **Committee member / chair** | Communicate with fairness. Get recognised for what works. Protect the process. AI coaches tone. |
| **Body corporate manager** | Respond to records requests on time. Clean audit trail across schemes. Bulk announcements. |

### Three hero features

1. **Rulebook AI** — Plain-English Q&A over the scheme's registered by-laws with BCCM Act cross-reference. Same answer, whoever asks. Streams with citations.
2. **Graduated Communication Engine** — Stage 1 Friendly FYI → Stage 2 Formal Notice → Stage 3 Contravention Notice (Form 10) → Stage 4 Enforcement. Can't skip without logged justification. AI reviews every draft for defamation / inflammatory language before send.
3. **Evidence Vault + Case File Export** — Screenshots, emails, photos auto-structured by Claude vision. Lawyer-ready PDF bundle one-click.

### Supporting features shipped
- Records Requests Portal with 7-day statutory deadline tracker
- Legal Issue Register
- Impact Log (personal, private, permanently shielded)
- Timeline with swim-lanes (parking / notices / committee conduct / public posts / impact)
- Scheme Announcements (bulk, in-app only)
- Investigations with Tier 1–4 data release + per-member consent
- My Data & Privacy (export, consent defaults)
- Support page with FAQ, wellbeing resources, BCCM Commissioner contact

---

## 2. Where we are

### Built and working end-to-end

- Auth (email/password, Google OAuth ready)
- **Dev one-click login** with 4 role-specific accounts (owner, tenant, committee chair, manager)
- Zero-friction onboarding (auto-creates scheme on first login)
- Dashboard (education-first, role-shaped)
- Rulebook AI streaming chat with RAG over pgvector
- By-law PDF upload → parse → chunk → embed → index
- Evidence Vault (upload, paste, Claude vision auto-extract)
- Timeline + Impact Log (30-day recharts trend)
- Graduated Comms drafter with moderation pass
- Records Requests drafter with 7-day countdown
- Legal Issue Register
- PDF Case File export (`@react-pdf/renderer`, ~0.5s for 50 items)
- Scheme Announcements with leadership-only publish
- Investigation requests with 4-tier data classification + per-member consent UI
- Settings: scheme details, by-laws library, privacy policy, profile
- Support page
- Landing, about, privacy, terms (template)
- RLS on every table, verified no redirect loops
- Audit log on every mutation
- Sentry + PostHog wiring (inactive until DSN/keys set)

### Stubbed / placeholder

- **Email sending** — all drafters produce copy-paste or PDF output. No SMTP/API call. Developer wires Resend (details §5).
- **Push notifications** — no push; announcements live on dashboard feed only. Add web push when needed.
- **Investigation export bundle (ZIP of released data + cover PDF)** — UI shows status, RLS gates data, but the zip generator isn't built. See `lib/investigations.ts` — computeTierCounts done, bundle build is TODO.
- **AI review diff UI** — comms route has moderation but doesn't render the before/after side-by-side. Moderation runs; just no diff UI.
- **Committee/manager task inbox** — incoming records requests + incoming lot-owner comms aren't surfaced in one queue. Build `/inbox` page reading both tables.
- **Multi-scheme manager view** — data model supports it, UI picks first membership. Add scheme switcher.
- **Balance Score algorithm** — explicitly out of v1 scope. Dashboard shows "Coming soon" placeholder.
- **Anonymous reporting** — explicitly out of v1 scope.
- **State-by-state jurisdictions** — `schemes.jurisdiction` + `governing_act` fields exist. Prompts are QLD-only. Add NSW/VIC/etc. variants of `lib/claude/prompts.ts` when expanding.

### Known defects (none blocking)

- Vercel build shows a deprecation warning for `middleware.ts` → `proxy.ts` in Next 16 (non-breaking).
- Hand-maintained `lib/supabase/types.ts` — regenerate from live DB once production Supabase exists (command in §5).
- The Mission Control Supabase project used for dev testing is NOT in Sydney region. Production Parity MUST be in `ap-southeast-2`.

---

## 3. Tech stack + why

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router, RSC, Turbopack) | Single deploy, server components shrink client bundle, native streaming for AI, Vercel-native. |
| Language | **TypeScript 5** | Safety at scale, best-in-class editor tooling. |
| Styling | **Tailwind v4** + custom tokens | Speed. Warm stone palette + teal brand overrides Tailwind's cold default greys. |
| UI primitives | **Radix UI + shadcn pattern** (copied, not npm) | Accessible, composable, no framework lock-in. |
| Auth / DB / Storage | **Supabase** (Sydney `ap-southeast-2`) | AU residency mandatory. Postgres + Auth + Storage + RLS in one. |
| DB SSR | **@supabase/ssr** | Cookie-based auth in Next App Router. |
| Vector | **Supabase pgvector** + HNSW | Same DB, no extra infra. |
| Embeddings | **Voyage AI `voyage-3`** (1024-dim) | Cheaper + stronger than OpenAI for RAG in our tests. |
| Reasoning | **Anthropic Claude** (`claude-sonnet-4-5` chat, `claude-haiku-4-5` fast) | Required by brief — no other providers for reasoning. |
| Fonts | **Geist Sans** (Vercel) + **Instrument Serif** (italic accent only) | Geist is battle-tested premium; Instrument Serif adds editorial warmth to hero moments without looking olde-worlde. |
| Icons | **lucide-react** | Clean, tree-shakeable. |
| Forms | **react-hook-form + zod** | Type-safe validation; already installed. |
| Rich text | **Tiptap** | Already installed; used where needed. |
| PDF | **@react-pdf/renderer** | Server-side, React-native syntax, styleable. |
| Email | **Resend** (TO WIRE) | Simple API, great deliverability, AU-compatible. See §5. |
| Error tracking | **Sentry** | `instrumentation.ts` wired; DSN needed. |
| Product analytics | **PostHog** | `components/shared/posthog-provider.tsx` wired; key needed. |
| Hosting | **Vercel** (Sydney edge) | Pairs with Supabase AU; `vercel.json` pins functions to `syd1`. |
| Data export | **JSON + react-pdf** | Standards-compliant, portable, lawyer-friendly. |

**Explicitly rejected:** Prisma (kept stack thin), any non-Anthropic reasoning provider, any non-Australian primary datastore.

---

## 4. Repo structure

```
parity/
├── app/                        Next.js App Router
│   ├── (auth)/                 login, signup, onboarding
│   ├── (app)/                  authed shell + all product pages
│   │   ├── dashboard/          education-first home
│   │   ├── chat/               Rulebook AI streaming + citations
│   │   ├── announcements/      bulk comms (leadership post)
│   │   ├── communications/     Stage 1→4 drafter
│   │   ├── records/            BCCM records requests + 7-day clock
│   │   ├── evidence/           vault: upload, paste, AI-structure
│   │   ├── timeline/           swim-lanes
│   │   ├── impact/             daily log + 30-day chart
│   │   ├── issues/             legal issue register
│   │   ├── investigations/     Tier 1-4 gated export
│   │   ├── export/             case-file PDF generator
│   │   ├── settings/           scheme, by-laws library, privacy, profile
│   │   └── support/            FAQ + wellbeing + contact
│   ├── api/
│   │   ├── auth/               Supabase callback + signout
│   │   ├── chat/               streaming Claude endpoint
│   │   ├── evidence/analyse/   vision + text extraction
│   │   ├── ingest/             PDF → chunk → embed
│   │   ├── communications/     draft + serve (with moderation)
│   │   ├── records/draft/      records-request drafter
│   │   ├── announcements/      bulk comms CRUD
│   │   ├── investigations/     open + consent
│   │   ├── me/                 privacy + export-my-data
│   │   ├── export/             case-file PDF
│   │   ├── debug/error/        Sentry smoke test
│   │   └── dev/login/          dev auto-onboard (disabled in prod)
│   ├── landing, privacy, terms, about
│   └── layout.tsx              GeistSans + Instrument Serif + PostHog
├── components/
│   ├── ui/                     Button, Input, Card, Badge, Disclaimer, LegalWarning
│   ├── shared/                 Sidebar, PageHeader, PostHogProvider
│   ├── evidence, chat, comms   feature components
├── lib/
│   ├── config.ts               env vars + placeholder detection
│   ├── utils.ts                cn, date helpers
│   ├── audit.ts                audit_log writer
│   ├── rate-limit.ts           daily-limit check via audit counts
│   ├── scheme.ts               getActiveScheme for server pages
│   ├── comms.ts                stage enum + labels
│   ├── investigations.ts       tier computation + createInvestigation
│   ├── supabase/               client.ts, server.ts (SSR), types.ts
│   ├── claude/                 client, prompts (versioned), rag,
│   │                           embeddings, evidence, ingest, comms
│   ├── pdf/                    case-file.tsx, extract.ts
│   └── demo/                   seed data (not used in prod)
├── supabase/
│   ├── migrations/             0001 schema, 0002 RLS, 0003 storage
│   ├── ONE_PASTE.sql           combined for dashboard paste
│   ├── PATCH_SQL.sql           brings simplified schema to full spec
│   ├── PATCH2_RLS_FIX.sql      removes recursive RLS self-reference
│   └── PATCH3_PHASE10.sql      Phase 10 additions (announcements, investigations)
├── scripts/
│   ├── apply-migrations.mjs    runs migrations via pg (needs DB URL)
│   ├── probe-pooler.mjs        diagnose Supabase pooler routes
│   ├── e2e-smoke.mjs           auth + route redirect check
│   └── rls-test.md             manual RLS smoke script
├── instrumentation.ts          Sentry init
├── middleware.ts               auth gate
├── vercel.json                 syd1 region pin + per-route maxDuration
├── PARITY_BUILD_BRIEF.md       original product brief
├── DECISIONS.md                choices we made & why
├── SETUP.md                    step-by-step environment setup
├── HANDOFF.md                  end-user / product-owner handoff
└── DEVELOPER_HANDOFF.md        THIS FILE
```

---

## 5. Developer action list — from here to production

### 5.1 Provision production Supabase (must-do)

1. https://supabase.com/dashboard → New project.
2. **Region: Southeast Asia (Sydney) — `ap-southeast-2`**. Not negotiable — AU residency.
3. Set a strong DB password. Store in a password manager.
4. Note the project ref (looks like `abcxyz123...`) and API keys.
5. Apply the schema — three options:
   - **Fastest:** open `supabase/ONE_PASTE.sql`, paste into SQL Editor, Run. Then paste `supabase/PATCH_SQL.sql`. Then `PATCH2_RLS_FIX.sql`. Then `PATCH3_PHASE10.sql`.
   - **Cleaner:** `supabase/migrations/0001_init.sql`, `0002_rls.sql`, `0003_storage.sql`, then `PATCH3_PHASE10.sql`.
   - **CLI:** `npx supabase link --project-ref <ref>` then `npx supabase db push`.
6. Enable Email/Password auth (on by default) and optionally Google OAuth (Auth → Providers → Google).
7. Regenerate TypeScript types against the real DB:
   ```
   npx supabase login
   npx supabase gen types typescript --project-id <ref> > lib/supabase/types.ts
   ```

### 5.2 Set environment variables

Copy `.env.example` → `.env.local`. Required:

| Variable | Source | Notes |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | your domain | `https://parity.app` in prod |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API | |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API | **Server-only.** Never expose. |
| `SUPABASE_REGION` | `ap-southeast-2` | enforced at runtime in prod |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com | for chat + vision + drafters |
| `VOYAGE_API_KEY` | https://www.voyageai.com | for RAG embeddings |
| `RESEND_API_KEY` | https://resend.com | **Email** — see §5.4 |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | https://sentry.io | error tracking |
| `NEXT_PUBLIC_POSTHOG_KEY` | https://posthog.com | product analytics |

### 5.3 Deploy to Vercel

```bash
npm i -g vercel
cd parity
vercel link
# copy env vars into Vercel Project Settings → Environment Variables
vercel --prod
```

`vercel.json` already pins functions to `syd1`. Confirm by:
- Vercel → Project → Settings → Functions → Region = `syd1 (Sydney)`.

Point `parity.app` (or your chosen domain) at the Vercel project and wait for the ACME SSL cert.

### 5.4 Wire Resend email (10 min)

Create a Resend account, verify a sending domain (`parity.app` recommended). API key goes in `RESEND_API_KEY`.

Create a shared helper `lib/email/resend.ts`:
```ts
import { Resend } from "resend";
import { config } from "@/lib/config";
export const resend = config.resend.apiKey ? new Resend(config.resend.apiKey) : null;
```

Add these three email flows (all server-side; none currently live):

1. **Confirmation email on signup.** Supabase already sends this — just set the Sender email in Supabase → Auth → Email Templates.
2. **Announcement email blast** — in `/app/api/announcements/route.ts`, after insert, loop over scheme memberships and `resend.emails.send()` one per member. Respect members' email preferences (new table recommended: `member_notification_prefs`).
3. **Investigation consent request** — in `lib/investigations.ts::createInvestigation`, send one email per `ask`-policy member with a link to `/investigations/<id>`.

Template recommendation: `@react-email/components` (peer to `@react-pdf/renderer`). Create one base layout, one template per flow. Previews via `react-email dev`.

### 5.5 Wire web push notifications (1-2 hours, optional)

For real-time "you have a new consent request" / "committee posted an announcement" banners on open sessions:

1. Install `web-push`.
2. Generate VAPID keys: `npx web-push generate-vapid-keys`. Add to env.
3. Add a service worker at `app/service-worker.ts` that listens for push events.
4. On login, prompt for notification permission; store subscription in a new `push_subscriptions` table.
5. In announcement/investigation API routes, fan out pushes to subscriptions.

### 5.6 Finish the stubs

| TODO | Location | Est. effort |
|---|---|---|
| Investigation export ZIP builder | `app/api/investigations/[id]/export/route.ts` (new) | half a day |
| Committee/manager task inbox `/inbox` | new page | half a day |
| AI review diff UI in comms drafter | extend `app/(app)/communications/new/form.tsx` | 2-3 hours |
| Scheme switcher for multi-scheme managers | sidebar dropdown + cookie | 3-4 hours |
| Member notification prefs UI | Settings → Notifications | 2-3 hours |
| Real Anthropic moderation for announcements | extend `app/api/announcements/route.ts` to call `moderateDraft` | 1 hour |

### 5.7 Run the RLS smoke test (release blocker)

Follow `scripts/rls-test.md`. Two users, same scheme. Confirm User B cannot read User A's private evidence via any path (UI, REST API, direct SQL). If this fails, **halt release**.

### 5.8 Legal review (release blocker)

`app/privacy/page.tsx` and `app/terms/page.tsx` are templates flagged in-file. Before any user touches the site, send both to a qualified Australian lawyer with privacy + strata expertise.

Recommended additional legal pass:
- AI output disclaimers (already present; confirm wording)
- Investigation data-release consent language
- Defamation risk for AI-drafted formal notices

---

## 6. Security + data model

### RLS architecture

Every table has RLS enabled with policies in `supabase/migrations/0002_rls.sql` + `PATCH3_PHASE10.sql`. The short version:

- **Evidence, Impact Log, Chat, Private drafts** — uploader-owned. Invisible to the rest of the scheme unless explicitly shared.
- **Communications** — sender owns own; scheme-leadership reads comms addressed to `committee`.
- **Records requests** — requester owns; leadership reads scheme-wide.
- **Announcements** — any member reads; leadership writes.
- **Investigation requests** — requester + leadership read; member sees only own consent row.
- **Investigation consents** — strictly member-scoped selects. Leadership gets counts via service role only.
- **Audit log** — user sees own rows. Service role writes system events.

### The four data tiers (for investigation release)

| Tier | What | Release rule |
|---|---|---|
| **1** | Scheme-public (committee comms, announcements, records requests, minutes) | Auto — available immediately |
| **2** | Shared-to-scheme (evidence / issues with `shared_with_scheme = true`) | Auto — already opted in |
| **3** | Member-private (evidence, private drafts, one-on-ones) | Per-member consent. Default policy in Settings. |
| **4** | Personal wellbeing (Impact Log, private chats) | **Permanently shielded.** Never released under any investigation. Coercion shield. Hard-coded, not toggleable. |

### Audit log

Every mutation calls `lib/audit.ts::audit()` which writes to `audit_log` with:
- user_id
- scheme_id
- action (enum: `scheme_created`, `bylaws_ingested`, `evidence_created`, `comms_drafted`, `comms_served`, `comms_stage_skipped`, `records_drafted`, `records_submitted`, `records_fulfilled`, `impact_logged`, `issue_raised`, `issue_updated`, `export_generated`, `chat_message`, `rls_denial`)
- entity_type + entity_id
- metadata (jsonb)
- created_at

The audit log is the spine of the lawyer-ready case file. Every PDF export includes the last N audit entries on its final page.

### Rate limiting

Per-user daily limits enforced by counting `audit_log` rows in last 24h:
- 20 chat messages/day
- 10 evidence analyses/day
- 5 draft generations/day

Set in `lib/config.ts::limits`. Fail-open in placeholder mode.

### Content moderation

Before serving a communication at Stage 2 or higher, `lib/claude/comms.ts::moderateDraft` runs. Flags defamatory / inflammatory language. Returns low/medium/high risk + specific phrases. If flagged medium+, user sees warning and must click "Serve anyway".

### AI hallucination guard

Rulebook AI refuses to answer if no retrieved chunk is above 0.7 similarity. Returns canonical "I cannot find this" response (in `lib/claude/prompts.ts::RULEBOOK_NO_MATCH_RESPONSE`). Never invents a by-law.

---

## 7. Testing

```bash
# Type check
npx tsc --noEmit

# Build (production verification)
npm run build

# Lint
npm run lint

# Dev server
PORT=3004 npm run dev

# E2E smoke: auth + route redirects
node scripts/e2e-smoke.mjs

# Apply migrations from a script (needs DATABASE_URL)
DATABASE_URL="postgresql://..." node scripts/apply-migrations.mjs

# Dev one-click login test
curl -X POST -H "Content-Type: application/json" -d '{"role":"owner"}' http://localhost:3004/api/dev/login

# Forced Sentry error (prod only)
curl https://<domain>/api/debug/error
```

All API routes follow a consistent pattern: 401 if unauth, 403 if unauthorised scheme role, 400 on validation failure, 500 on DB error, 200/OK with JSON payload.

---

## 8. Running locally as developer

```bash
git clone <repo>
cd parity
npm install
cp .env.example .env.local
# fill in real Supabase + Anthropic + Voyage keys
PORT=3000 npm run dev
# http://localhost:3000
```

Dev login buttons appear on `/login` when on `localhost`. Click "Enter as Lot Owner" → instant dashboard with seeded data.

### Regenerating TypeScript types against live Supabase

```bash
npx supabase login
npx supabase gen types typescript --project-id <your-project-ref> > lib/supabase/types.ts
```

### Working on UI without a backend

Everything falls back to a labelled placeholder when env vars are missing. The app boots, pages render, forms display. External calls short-circuit to deterministic fakes. Good for CSS / layout / component work without DB.

---

## 9. Where to look for each feature

| Feature | Start reading here |
|---|---|
| Auth | `middleware.ts`, `lib/supabase/server.ts`, `lib/supabase/client.ts`, `app/api/auth/*` |
| Dev auto-onboard | `app/api/dev/login/route.ts`, `app/(auth)/onboarding/page.tsx` |
| Rulebook AI | `app/api/chat/route.ts`, `lib/claude/rag.ts`, `lib/claude/prompts.ts::RULEBOOK_SYSTEM_PROMPT` |
| By-law ingestion | `app/api/ingest/route.ts`, `lib/claude/ingest.ts`, `lib/claude/embeddings.ts`, `lib/pdf/extract.ts` |
| Evidence | `app/(app)/evidence/*`, `app/api/evidence/analyse/route.ts`, `lib/claude/evidence.ts` |
| Communications | `app/(app)/communications/*`, `lib/claude/comms.ts`, `lib/comms.ts` |
| Records | `app/(app)/records/*`, `app/api/records/draft/route.ts` |
| Announcements | `app/(app)/announcements/*`, `app/api/announcements/route.ts` |
| Investigations | `app/(app)/investigations/*`, `app/api/investigations/*`, `lib/investigations.ts` |
| Privacy + export | `app/(app)/settings/privacy-section.tsx`, `app/api/me/*` |
| PDF case file | `app/(app)/export/*`, `app/api/export/route.tsx`, `lib/pdf/case-file.tsx` |
| Audit log | `lib/audit.ts` |
| Legal warning | `components/ui/legal-warning.tsx` (placed on Stage 2+, records, investigations, support, PDF) |

---

## 10. Product design principles (don't break these)

1. **Education + communication first, litigation last.** Every feature rolls up to "help people understand and communicate"; evidence / case-file is the safety net, not the product.
2. **Neutral by design.** Same answer regardless of who asks. Same UI for every role, shaped differently where role matters.
3. **Default private.** Nothing shared with others unless the user explicitly opts in.
4. **Audit everything.** Every mutation goes through `audit()`.
5. **AI reviews before humans send.** Every formal draft gets a moderation pass.
6. **No hallucinated by-laws.** 0.7 similarity threshold, canonical refuse response.
7. **"Not legal advice" always.** On every AI answer, every export, every formal draft.
8. **AU data residency.** Hard-fail in prod if region env var is not `ap-southeast-2`.
9. **No power-asymmetric releases.** Member-private data only moves with member consent. Aggregate counts, never attributed refusals.
10. **Wellbeing data is sacred.** Impact Log + private chats NEVER leave, regardless of consent. Coercion shield.

---

## 11. Commits / git history

```
Phase 1-9 shipped (see git log):
  Phase 1: Foundation (Next.js 16, Supabase SSR, auth, migrations, RLS)
  Phase 2: Scheme onboarding + by-law ingestion (PDF parse, chunk, embed, pgvector)
  Phase 3: Rulebook AI (streaming, RAG over pgvector, pill citations, sessions)
  Phase 4: Evidence Vault (list, auto-analyse, detail, share opt-in)
  Phase 5: Timeline swimlanes + Impact Log with 30-day trend
  Phase 6: Graduated Communications (stage gating, drafter, moderation, serve)
  Phase 7: Records Requests (BCCM drafter, 7-day statutory deadline)
  Phase 8: Legal issue register + PDF case-file export (@react-pdf/renderer)
  Phase 9: Sentry + PostHog wiring, error smoke endpoint, vercel syd1, RLS test, SETUP + DECISIONS

Phase 10 (this handoff):
  Phase 10: Phase 10 — Communications portal v2 + Investigations + Consent defaults + Announcements + Support + Typography upgrade
```

---

## 12. Contact

**Product owner:** Matty Mannion
**Support inbox:** support@parity.app (set up before first public user)
**Privacy inbox:** privacy@parity.app
**Security reports:** security@parity.app

Parity is a StrataBalance Pty Ltd product.
