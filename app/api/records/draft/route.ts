import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { draftRecordsRequest } from "@/lib/claude/comms";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const rl = await checkRateLimit(user.id, "draft_generation");
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Daily draft limit reached (${rl.limit}).` },
      { status: 429 },
    );
  }

  const body = (await req.json()) as {
    schemeId: string;
    requestTypes: string[];
    specificItems?: string;
  };

  const { data: membership } = await supabase
    .from("scheme_memberships")
    .select("lot_number")
    .eq("user_id", user.id)
    .eq("scheme_id", body.schemeId)
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "not a member" }, { status: 403 });

  const { data: scheme } = await supabase
    .from("schemes")
    .select("name")
    .eq("id", body.schemeId)
    .maybeSingle();
  if (!scheme) return NextResponse.json({ error: "scheme not found" }, { status: 404 });

  const draft = await draftRecordsRequest({
    schemeName: (scheme as { name: string }).name,
    requesterName: user.user_metadata?.full_name || user.email || "Lot occupant",
    lotNumber: (membership as { lot_number: string | null }).lot_number || undefined,
    requestTypes: body.requestTypes,
    specificItems: body.specificItems,
  });

  await supabase.from("audit_log").insert({
    user_id: user.id,
    scheme_id: body.schemeId,
    action: "records_drafted",
    entity_type: "records_requests",
    metadata: { types: body.requestTypes },
  });

  return NextResponse.json(draft);
}
