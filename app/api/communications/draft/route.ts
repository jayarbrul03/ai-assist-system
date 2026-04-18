import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { draftCommunication } from "@/lib/claude/comms";
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
      { error: `Daily draft generation limit reached (${rl.limit}).` },
      { status: 429 },
    );
  }

  const body = (await req.json()) as {
    stage: "stage_1_fyi" | "stage_2_formal_notice" | "stage_3_contravention_notice" | "stage_4_enforcement";
    schemeId: string;
    toParty: string;
    topic: string;
    bylawCitations?: string[];
    relatedEvidenceIds?: string[];
    stageSkipJustification?: string;
    priorStageSummary?: string;
  };

  // Membership + scheme lookup
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

  let linkedEvidence: Array<{ description?: string | null; occurred_at?: string | null }> = [];
  if (body.relatedEvidenceIds && body.relatedEvidenceIds.length) {
    const { data: evs } = await supabase
      .from("evidence_items")
      .select("description, occurred_at, exact_words")
      .in("id", body.relatedEvidenceIds);
    if (evs) linkedEvidence = evs as typeof linkedEvidence;
  }

  const draft = await draftCommunication({
    stage: body.stage,
    schemeName: (scheme as { name: string }).name,
    fromName: user.user_metadata?.full_name || user.email || "Lot occupant",
    fromLot: (membership as { lot_number: string | null })?.lot_number || undefined,
    toParty: body.toParty,
    topic: body.topic,
    bylawCitations: body.bylawCitations,
    linkedEvidence,
    priorStageSummary: body.priorStageSummary,
    stageSkipJustification: body.stageSkipJustification,
  });

  // Log draft generation for rate-limit counting
  await supabase.from("audit_log").insert({
    user_id: user.id,
    scheme_id: body.schemeId,
    action: "comms_drafted",
    entity_type: "communications",
    metadata: { stage: body.stage, topic: body.topic },
  });

  return NextResponse.json(draft);
}
