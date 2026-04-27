import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isLeadershipRole } from "@/lib/roles";
import { batchInboxSummaries } from "@/lib/claude/inbox-summaries";
import { checkRateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_IDS = 15;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const body = (await req.json()) as { communicationIds?: string[] };
  const clean = [
    ...new Set(
      (Array.isArray(body.communicationIds) ? body.communicationIds : [])
        .map(String)
        .filter(Boolean),
    ),
  ].slice(0, MAX_IDS);
  if (clean.length === 0) return NextResponse.json({ items: [] });

  const { data: mem } = await supabase
    .from("scheme_memberships")
    .select("scheme_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!mem || !isLeadershipRole((mem as { role: string }).role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const schemeId = (mem as { scheme_id: string }).scheme_id;

  const rl = await checkRateLimit(user.id, "inbox_ai_batch");
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Daily inbox AI batch limit reached (${rl.limit}).` },
      { status: 429 },
    );
  }

  const { data: rows, error } = await supabase
    .from("communications")
    .select("id, subject, body, to_party, status")
    .eq("scheme_id", schemeId)
    .in("id", clean);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const list = (rows ?? []) as Array<{
    id: string;
    subject: string | null;
    body: string | null;
    to_party: string | null;
    status: string | null;
  }>;
  if (list.length === 0) return NextResponse.json({ items: [] });

  const items = await batchInboxSummaries(list);
  await audit({
    action: "inbox_ai_batch",
    entityType: "communications",
    schemeId,
    metadata: { count: items.length },
  });
  return NextResponse.json({ items });
}
