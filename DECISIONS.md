# DECISIONS.md

Choices Parity made where the brief was silent or had tradeoffs worth
recording. Each entry is dated and linked to the commit that introduced it.

---

## 2026-04-18 — Next.js 16 instead of 15

Brief said Next.js 15. `create-next-app@latest` installed 16.2.4, which is
strictly newer and compatible. I went with 16 rather than pinning back.

**Impact:** `middleware` is renamed to `proxy` in 16 (non-breaking, a
deprecation warning shows at build time). All features (App Router, RSC,
streaming) work the same. No action needed.

## 2026-04-18 — Scaffolded into `parity/` subdirectory, not project root

The working directory was `/Users/mattymannion/BODY CORP BALANCE ` (trailing
space, uppercase). `create-next-app` rejected it because npm package names
must be lowercase and space-free. I created the app inside `parity/` and
initialised git there.

**Impact:** All commands run from `parity/`, not the parent. Absolute paths in
SETUP.md reflect this.

## 2026-04-18 — Database types hand-maintained, not generated

Supabase's `gen types typescript` requires a live project. I wrote
`lib/supabase/types.ts` by hand, matching the schema in migrations.

**Impact:** When you provision the real Supabase project, run:
```
npx supabase gen types typescript --project-id <ref> > lib/supabase/types.ts
```
to replace the hand-maintained types.

## 2026-04-18 — Supabase client generic dropped

Supabase-JS v2 + postgrest 12 had strict-inference issues when the hand-rolled
`Database` generic was applied (table rows inferred as `never`). I dropped
the generic from `createClient()` / `createServerClient()` in
`lib/supabase/client.ts` and `lib/supabase/server.ts`. Callers cast row
results to the hand-maintained types when needed.

**Impact:** Zero runtime change. Slightly less type safety at the SDK call
site. Fix by regenerating types from the live project (previous entry).

## 2026-04-18 — Placeholder env vars always boot the app

`lib/config.ts` no longer throws on missing env vars at module load. It
returns `__MISSING__*` sentinels, and each external API call-site guards
itself with `requireRealConfig()` or falls back deterministically (Voyage
embeddings use a deterministic fake vector; Claude fallbacks return the top
retrieved chunk verbatim). This keeps `next build` green without creds.

**Impact:** Set real env vars before running against real data. The SETUP.md
checklist flags every required var.

## 2026-04-18 — No Supabase CLI / migration runner included

Migrations are raw `.sql` files in `supabase/migrations/`. You apply them
manually in the Supabase SQL Editor, or via `supabase db push` after
`supabase link`. I did not add the Supabase CLI as a dev dep because the
brief says "keep the stack thin" and a human must create the project first
anyway.

## 2026-04-18 — Rate limiting uses audit_log counts, not a separate table

Per-user daily limits (20 chat / 10 evidence / 5 drafts) are enforced by
counting `audit_log` rows of the corresponding action in the last 24h. This
reuses an existing table instead of creating a `rate_limits` table. It fails
open in placeholder mode.

**Impact:** If a user's audit insert fails silently, they might bypass the
limit. Acceptable for beta; revisit before paid tiers.

## 2026-04-18 — Vision evidence analyser accepts PDFs only as text, not images

Evidence analyser handles images (png/jpg/gif/webp) via Claude vision, and
pasted text via Claude text models. PDFs are not auto-analysed on the
evidence path — users paste the relevant text from a PDF instead.

**Impact:** PDF-to-image conversion for evidence is out of scope for v1.

## 2026-04-18 — Scheme onboarding assumes single-scheme membership

Users join one scheme on signup. The data model supports multi-scheme, but
the UI picks the most-recent membership and does not offer a switcher.
Multi-scheme dashboard is Section 0 out-of-scope for v1 anyway.

## 2026-04-18 — Committee member reads scoped to scheme-level data only

RLS in `0002_rls.sql` grants committee roles (`committee_chair`,
`committee_member`, `manager`) read access to scheme-wide
`communications` where `to_party = 'committee'`, but not to individual
`evidence_items` or `impact_entries`. Evidence is strictly uploader-owned
unless `shared_with_scheme = true`.

## 2026-04-18 — Statutory deadline is counted from served_at, not fee-paid date

BCCM Act requires 7 days from "the request being served and any fee being
paid". The UI surfaces `served_at + 7d` as the deadline. If a fee is
outstanding, the user should not mark "served" until the fee is paid.
Captured in the records drafter body text.

## 2026-04-18 — `_debug/` renamed to `debug/`

Next.js treats directories starting with `_` as private (not routable). The
Sentry smoke-test endpoint lives at `/api/debug/error`.
