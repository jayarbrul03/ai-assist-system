import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";
import {
  createInvestigation,
  type InvestigationBasis,
} from "@/lib/investigations";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const body = (await req.json()) as {
    schemeId: string;
    basis: InvestigationBasis;
    basisDetail?: string;
    scopeFrom?: string;
    scopeTo?: string;
  };

  // Must be leadership
  const { data: membership } = await supabase
    .from("scheme_memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("scheme_id", body.schemeId)
    .maybeSingle();

  const role = (membership as { role?: string } | null)?.role;
  if (!role || !["committee_chair", "committee_member", "manager"].includes(role)) {
    return NextResponse.json(
      { error: "only committee or manager may open an investigation" },
      { status: 403 },
    );
  }

  const { id } = await createInvestigation({
    schemeId: body.schemeId,
    requestedBy: user.id,
    basis: body.basis,
    basisDetail: body.basisDetail,
    scopeFrom: body.scopeFrom,
    scopeTo: body.scopeTo,
  });

  await audit({
    action: "export_generated",
    entityType: "investigation_requests",
    entityId: id,
    schemeId: body.schemeId,
    metadata: { kind: "investigation_opened", basis: body.basis },
  });

  return NextResponse.json({ id });
}
