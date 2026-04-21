import { createClient, createServiceClient } from "@/lib/supabase/server";

export type InvestigationBasis =
  | "bccm_commissioner_dispute"
  | "insurance_claim"
  | "regulatory_inquiry"
  | "internal_review"
  | "other";

export interface TierCounts {
  tier1: number; // scheme-public (committee comms, announcements, minutes)
  tier2: number; // shared-to-scheme (evidence / issues user opted into sharing)
  tier3_pending: number; // private data awaiting consent
  tier3_released: number;
  tier3_refused: number;
  tier3_auto: number;
  tier4_blocked: number; // impact log + private chat — permanently shielded
}

export const BASIS_LABEL: Record<InvestigationBasis, string> = {
  bccm_commissioner_dispute: "BCCM Commissioner dispute",
  insurance_claim: "Insurance claim",
  regulatory_inquiry: "Regulatory inquiry",
  internal_review: "Internal review",
  other: "Other",
};

/**
 * Compute tier counts for an investigation. Uses service client so we can see
 * across members without RLS blocking counts.
 */
export async function computeTierCounts(
  schemeId: string,
  investigationId: string,
): Promise<TierCounts> {
  const svc = createServiceClient();

  // Tier 1: scheme-level comms (to_party = committee/all) + announcements + records
  const [t1Comms, t1Announce, t1Records] = await Promise.all([
    svc
      .from("communications")
      .select("id", { count: "exact", head: true })
      .eq("scheme_id", schemeId)
      .in("to_party", ["committee", "all", "scheme"]),
    svc
      .from("scheme_announcements")
      .select("id", { count: "exact", head: true })
      .eq("scheme_id", schemeId),
    svc
      .from("records_requests")
      .select("id", { count: "exact", head: true })
      .eq("scheme_id", schemeId),
  ]);

  const tier1 =
    (t1Comms.count ?? 0) + (t1Announce.count ?? 0) + (t1Records.count ?? 0);

  // Tier 2: shared-to-scheme evidence + shared legal issues
  const [t2Ev, t2Iss] = await Promise.all([
    svc
      .from("evidence_items")
      .select("id", { count: "exact", head: true })
      .eq("scheme_id", schemeId)
      .eq("shared_with_scheme", true),
    svc
      .from("legal_issues")
      .select("id", { count: "exact", head: true })
      .eq("scheme_id", schemeId),
  ]);
  const tier2 = (t2Ev.count ?? 0) + (t2Iss.count ?? 0);

  // Tier 3: per-member private evidence + private communications. We report
  // counts via consent states; the actual rows are not aggregated here.
  const { data: consents } = await svc
    .from("investigation_consents")
    .select("response")
    .eq("investigation_id", investigationId);

  const responses = (consents ?? []) as Array<{ response: string }>;
  const tier3_pending = responses.filter((r) => r.response === "pending").length;
  const tier3_released = responses.filter(
    (r) => r.response === "released" || r.response === "released_redacted",
  ).length;
  const tier3_auto = responses.filter((r) => r.response === "auto_released").length;
  const tier3_refused = responses.filter(
    (r) => r.response === "refused" || r.response === "expired",
  ).length;

  // Tier 4: count only — never released. This is just to show manager
  // upfront what's out of reach.
  const { count: impactCount } = await svc
    .from("impact_entries")
    .select("id", { count: "exact", head: true })
    .eq("scheme_id", schemeId);
  const { count: chatCount } = await svc
    .from("chat_messages")
    .select("id", { count: "exact", head: true });

  return {
    tier1,
    tier2,
    tier3_pending,
    tier3_released,
    tier3_refused,
    tier3_auto,
    tier4_blocked: (impactCount ?? 0) + (chatCount ?? 0),
  };
}

/**
 * Create investigation: insert the request, create pending consent records
 * for every non-leadership member of the scheme, auto-apply their default
 * policy (fast_release / refuse) immediately.
 */
export async function createInvestigation(args: {
  schemeId: string;
  requestedBy: string;
  basis: InvestigationBasis;
  basisDetail?: string;
  scopeFrom?: string;
  scopeTo?: string;
}): Promise<{ id: string }> {
  const svc = createServiceClient();

  const { data: inv, error: invErr } = await svc
    .from("investigation_requests")
    .insert({
      scheme_id: args.schemeId,
      requested_by: args.requestedBy,
      basis: args.basis,
      basis_detail: args.basisDetail ?? null,
      scope_from: args.scopeFrom ?? null,
      scope_to: args.scopeTo ?? null,
      status: "open",
    })
    .select("id")
    .single();

  if (invErr || !inv) {
    throw new Error(invErr?.message ?? "could not create investigation");
  }

  const investigationId = (inv as { id: string }).id;

  // Find all non-leadership members (lot owners, tenants, observers)
  const { data: members } = await svc
    .from("scheme_memberships")
    .select("user_id, role, investigation_default_policy")
    .eq("scheme_id", args.schemeId);

  const affected = (members ?? []).filter(
    (m) =>
      (m as { role: string }).role === "owner" ||
      (m as { role: string }).role === "tenant" ||
      (m as { role: string }).role === "observer",
  ) as Array<{
    user_id: string;
    role: string;
    investigation_default_policy: "ask" | "fast_release" | "refuse" | null;
  }>;

  const now = new Date().toISOString();

  for (const m of affected) {
    const policy = m.investigation_default_policy ?? "ask";
    const response: "pending" | "auto_released" | "refused" =
      policy === "fast_release"
        ? "auto_released"
        : policy === "refuse"
        ? "refused"
        : "pending";
    await svc.from("investigation_consents").insert({
      investigation_id: investigationId,
      member_id: m.user_id,
      scheme_id: args.schemeId,
      response,
      responded_at: response === "pending" ? null : now,
    });
  }

  return { id: investigationId };
}
