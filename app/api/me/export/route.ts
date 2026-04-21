import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

/**
 * Export-my-data: returns a single JSON document containing everything
 * THIS user owns in their active scheme. No other members' data.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const url = new URL(req.url);
  const schemeId = url.searchParams.get("schemeId");
  if (!schemeId) {
    return NextResponse.json({ error: "missing schemeId" }, { status: 400 });
  }

  const [
    { data: scheme },
    { data: membership },
    { data: evidence },
    { data: comms },
    { data: records },
    { data: impact },
    { data: issues },
    { data: chatSessions },
    { data: chatMessages },
    { data: auditLog },
  ] = await Promise.all([
    supabase.from("schemes").select("*").eq("id", schemeId).maybeSingle(),
    supabase
      .from("scheme_memberships")
      .select("*")
      .eq("user_id", user.id)
      .eq("scheme_id", schemeId)
      .maybeSingle(),
    supabase.from("evidence_items").select("*").eq("uploaded_by", user.id),
    supabase.from("communications").select("*").eq("from_user", user.id),
    supabase.from("records_requests").select("*").eq("requester_id", user.id),
    supabase.from("impact_entries").select("*").eq("user_id", user.id),
    supabase.from("legal_issues").select("*").eq("raised_by", user.id),
    supabase.from("chat_sessions").select("*").eq("user_id", user.id),
    supabase
      .from("chat_messages")
      .select("*")
      .in(
        "session_id",
        (
          await supabase
            .from("chat_sessions")
            .select("id")
            .eq("user_id", user.id)
        ).data?.map((s) => (s as { id: string }).id) ?? [],
      ),
    supabase.from("audit_log").select("*").eq("user_id", user.id),
  ]);

  await audit({
    action: "export_generated",
    entityType: "personal_export",
    schemeId,
    metadata: { kind: "my_data_json" },
  });

  const payload = {
    generated_at: new Date().toISOString(),
    user: { id: user.id, email: user.email },
    scheme,
    membership,
    evidence,
    communications: comms,
    records_requests: records,
    impact_entries: impact,
    legal_issues: issues,
    chat_sessions: chatSessions,
    chat_messages: chatMessages,
    audit_log: auditLog,
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="parity-my-data-${Date.now()}.json"`,
    },
  });
}
