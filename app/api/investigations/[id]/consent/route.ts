import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const body = (await req.json()) as {
    response: "released" | "released_redacted" | "refused";
    redactionNotes?: string;
  };

  const { data: updated, error } = await supabase
    .from("investigation_consents")
    .update({
      response: body.response,
      redaction_notes: body.redactionNotes ?? null,
      responded_at: new Date().toISOString(),
    })
    .eq("investigation_id", id)
    .eq("member_id", user.id)
    .select("*")
    .maybeSingle();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated)
    return NextResponse.json({ error: "no consent row for you on that investigation" }, { status: 404 });

  await audit({
    action: "export_generated",
    entityType: "investigation_consents",
    entityId: id,
    metadata: { response: body.response, kind: "consent_given" },
  });

  return NextResponse.json({ ok: true });
}
