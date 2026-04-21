/**
 * Dev one-click login with auto-onboarding.
 *
 * 1. Service-role creates/resets user with email_confirm: true
 * 2. Ensures a demo scheme exists (Riverbend Residences CTS 48211)
 * 3. Attaches the user to that scheme with the right role
 * 4. Seeds sample evidence, comms, records, issues, impact entries if empty
 *
 * Disabled in production.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient as createSbClient } from "@supabase/supabase-js";
import { config, isMissing } from "@/lib/config";

export const runtime = "nodejs";

const ROLES = {
  owner: {
    email: "dev-owner@parity.local",
    password: "Parity-Dev-Owner-2026!",
    fullName: "Dev Owner (Lot 12)",
    role: "owner" as const,
    lot: "12",
  },
  tenant: {
    email: "dev-tenant@parity.local",
    password: "Parity-Dev-Tenant-2026!",
    fullName: "Dev Tenant (Lot 24)",
    role: "tenant" as const,
    lot: "24",
  },
  committee: {
    email: "dev-committee@parity.local",
    password: "Parity-Dev-Committee-2026!",
    fullName: "Dev Committee Chair",
    role: "committee_chair" as const,
    lot: "7",
  },
  manager: {
    email: "dev-manager@parity.local",
    password: "Parity-Dev-Manager-2026!",
    fullName: "Dev Body Corp Manager",
    role: "manager" as const,
    lot: null,
  },
} as const;

type RoleKey = keyof typeof ROLES;

const DEMO_SCHEME_NAME = "Riverbend Residences CTS 48211";

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "disabled in production" }, { status: 403 });
  }
  if (isMissing(config.supabase.serviceRoleKey)) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY not configured" },
      { status: 500 },
    );
  }

  const { role } = (await req.json()) as { role?: RoleKey };
  const spec = role && ROLES[role] ? ROLES[role] : ROLES.owner;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin: any = createSbClient(
    config.supabase.url,
    config.supabase.serviceRoleKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // 1. Ensure user exists with email confirmed.
  const { data: existing } = await admin.auth.admin.listUsers();
  let user = existing.users.find((u: { email?: string | null }) => u.email === spec.email);
  if (!user) {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: spec.email,
      password: spec.password,
      email_confirm: true,
      user_metadata: { full_name: spec.fullName, dev_role: spec.role },
    });
    if (createErr || !created.user) {
      return NextResponse.json(
        { error: createErr?.message || "create user failed" },
        { status: 500 },
      );
    }
    user = created.user;
  } else {
    await admin.auth.admin.updateUserById(user.id, {
      password: spec.password,
      email_confirm: true,
      user_metadata: { full_name: spec.fullName, dev_role: spec.role },
    });
  }

  // 2. Ensure demo scheme exists.
  let { data: scheme } = await admin
    .from("schemes")
    .select("*")
    .eq("name", DEMO_SCHEME_NAME)
    .maybeSingle();

  if (!scheme) {
    const { data: created } = await admin
      .from("schemes")
      .insert({
        name: DEMO_SCHEME_NAME,
        cms_number: "CMS-2019-4281",
        cts_number: "48211",
        jurisdiction: "QLD",
        governing_act: "BCCM 1997",
        regulation_module: "Accommodation Module",
        address: "12 Skyline Drive, South Brisbane QLD 4101",
        lot_count: 86,
        onboarded_by: user.id,
        created_by: user.id,
      })
      .select("*")
      .single();
    scheme = created;
  }

  if (!scheme) {
    return NextResponse.json({ error: "could not create demo scheme" }, { status: 500 });
  }

  // 3. Ensure membership exists for this user.
  const { data: membership } = await admin
    .from("scheme_memberships")
    .select("*")
    .eq("user_id", user.id)
    .eq("scheme_id", scheme.id)
    .maybeSingle();

  if (!membership) {
    await admin.from("scheme_memberships").insert({
      user_id: user.id,
      scheme_id: scheme.id,
      role: spec.role,
      lot_number: spec.lot,
      verified: true,
    });
  } else if (membership.role !== spec.role) {
    await admin
      .from("scheme_memberships")
      .update({ role: spec.role, lot_number: spec.lot })
      .eq("id", membership.id);
  }

  // 4. Seed sample data once (idempotent on a per-scheme-per-user basis).
  await seedSampleData(admin, scheme.id, user.id, spec);

  return NextResponse.json({
    email: spec.email,
    password: spec.password,
    fullName: spec.fullName,
    role: spec.role,
    schemeId: scheme.id,
    schemeName: scheme.name,
  });
}

async function seedSampleData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  schemeId: string,
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _spec: (typeof ROLES)[RoleKey],
) {
  // Only seed evidence if this user currently has no evidence in this scheme.
  const { count: evCount } = await admin
    .from("evidence_items")
    .select("id", { count: "exact", head: true })
    .eq("scheme_id", schemeId)
    .eq("uploaded_by", userId);

  if ((evCount ?? 0) === 0) {
    await admin.from("evidence_items").insert([
      {
        scheme_id: schemeId,
        uploaded_by: userId,
        shared_with_scheme: false,
        occurred_at: daysAgo(12),
        source: "email",
        location: "Visitor bay 3, basement",
        description:
          "Email from the body corporate manager instructing removal of a visitor's car within 2 hours, citing 'committee rule' not present in the registered by-laws.",
        exact_words:
          "Your visitor's vehicle in bay 3 must be moved within 2 hours or it will be towed at the owner's cost, as per committee rules on visitor parking.",
        rule_cited: "committee rule on visitor parking",
        rule_is_in_bylaws: false,
        rule_source: "verbal",
        impact_flags: ["anxiety", "interference_with_enjoyment"],
        issue_flags: ["overreach", "invalid_direction", "towing_pressure"],
        confidence: "likely",
        next_action: "draft_response",
        ai_summary:
          "A communication asserting an unregistered rule and threatening enforcement within a 2-hour window.",
      },
      {
        scheme_id: schemeId,
        uploaded_by: userId,
        shared_with_scheme: false,
        occurred_at: daysAgo(8),
        source: "photo",
        location: "Building foyer",
        description: "Signage posted in foyer stating all vehicles must reverse-park, without by-law reference.",
        exact_words: "ALL VEHICLES MUST REVERSE PARK — COMMITTEE RULE",
        rule_cited: "reverse-parking",
        rule_is_in_bylaws: false,
        rule_source: "signage",
        issue_flags: ["overreach"],
        confidence: "confirmed",
        next_action: "include_in_timeline",
        ai_summary: "Signage in foyer asserts a rule not present in the registered by-laws.",
      },
      {
        scheme_id: schemeId,
        uploaded_by: userId,
        shared_with_scheme: false,
        occurred_at: daysAgo(3),
        source: "notice",
        location: "Lot 12 letterbox",
        description: "Written notice threatening fines for parking orientation not matching foyer signage.",
        rule_cited: "foyer signage",
        rule_is_in_bylaws: false,
        rule_source: "signage",
        impact_flags: ["fear"],
        issue_flags: ["overreach", "procedural_defect"],
        confidence: "likely",
        next_action: "draft_response",
      },
    ]);
  }

  // Seed impact log if empty.
  const { count: impactCount } = await admin
    .from("impact_entries")
    .select("id", { count: "exact", head: true })
    .eq("scheme_id", schemeId)
    .eq("user_id", userId);

  if ((impactCount ?? 0) === 0) {
    const entries = [];
    for (let i = 0; i < 10; i++) {
      const date = new Date(Date.now() - (9 - i) * 86_400_000);
      entries.push({
        user_id: userId,
        scheme_id: schemeId,
        log_date: date.toISOString().slice(0, 10),
        bc_contact_occurred: i % 3 === 0,
        signage_or_towing_pressure: i === 2 || i === 8,
        family_anxiety: i >= 7,
        new_evidence_captured: i === 1 || i === 8,
        anxiety_score: Math.min(10, 2 + (i >= 7 ? 3 : 0) + Math.floor(Math.sin(i / 2) * 2)),
        disturbance_score: Math.min(10, 1 + (i >= 7 ? 2 : 0)),
        summary: i === 8 ? "Took photos of foyer signage." : null,
        legal_relevance: i >= 7 ? "medium" : "low",
      });
    }
    await admin.from("impact_entries").insert(entries);
  }

  // Seed an issue + a communication if none exist for this user.
  const { count: issueCount } = await admin
    .from("legal_issues")
    .select("id", { count: "exact", head: true })
    .eq("scheme_id", schemeId)
    .eq("raised_by", userId);

  if ((issueCount ?? 0) === 0) {
    await admin.from("legal_issues").insert({
      scheme_id: schemeId,
      raised_by: userId,
      issue_type: "overreach",
      headline: "Enforcement appears to rely on unregistered 'committee rules'",
      detail:
        "Multiple communications and notices cite committee rules or foyer signage as enforcement basis. Registered by-laws (12.3, 8.4) do not prescribe the positions asserted.",
      status: "open",
      confidence: "likely",
      next_step: "Serve Stage 2 Formal Notice requesting the by-law basis.",
    });
  }

  // Seed a sample comm.
  const { count: commCount } = await admin
    .from("communications")
    .select("id", { count: "exact", head: true })
    .eq("scheme_id", schemeId)
    .eq("from_user", userId);

  if ((commCount ?? 0) === 0) {
    await admin.from("communications").insert({
      scheme_id: schemeId,
      from_user: userId,
      to_party: "committee",
      to_party_email: "committee@riverbend.test",
      stage: "stage_1_fyi",
      subject: "FYI — Visitor parking enforcement clarification",
      body:
        "Hi committee,\n\nI wanted to flag some recent correspondence about visitor parking that references rules not present in the registered by-laws. Happy to chat.\n\nThis communication is made for the purpose of resolving a dispute and preserving the record.",
      bylaw_citations: ["12.3", "8.4"],
      status: "served",
      served_at: daysAgo(10),
      response_deadline: daysAgo(-4),
    });
  }

  // Seed a sample records request.
  const { count: recCount } = await admin
    .from("records_requests")
    .select("id", { count: "exact", head: true })
    .eq("scheme_id", schemeId);

  if ((recCount ?? 0) === 0) {
    await admin.from("records_requests").insert({
      scheme_id: schemeId,
      requester_id: userId,
      requested_by: userId,
      request_type: ["minutes", "correspondence", "towing_records"],
      specific_items:
        "Committee minutes and correspondence related to visitor parking enforcement, including instructions to contractors.",
      fee_acknowledged: true,
      submitted_at: daysAgo(4),
      served_at: daysAgo(4),
      statutory_deadline: daysAgo(-3),
      status: "submitted",
    });
  }
}
