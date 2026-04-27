import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isLeadershipRole } from "@/lib/roles";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

const INBOUND = ["committee", "manager"] as const;

function sanitize(labels: unknown): string[] {
  if (!Array.isArray(labels)) return [];
  const out: string[] = [];
  for (const x of labels) {
    if (typeof x !== "string") continue;
    const s = x
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_\s]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 32);
    if (s && !out.includes(s)) out.push(s);
    if (out.length >= 8) break;
  }
  return out;
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const body = (await req.json()) as { communicationId?: string; labels?: string[] };
  if (!body.communicationId) {
    return NextResponse.json({ error: "missing communicationId" }, { status: 400 });
  }
  const labels = sanitize(body.labels);

  const { data: comm, error: fErr } = await supabase
    .from("communications")
    .select("id, scheme_id, to_party")
    .eq("id", body.communicationId)
    .maybeSingle();
  if (fErr || !comm) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const c = comm as { id: string; scheme_id: string; to_party: string | null };
  if (!c.to_party || !INBOUND.includes(c.to_party as (typeof INBOUND)[number])) {
    return NextResponse.json({ error: "not inbound" }, { status: 400 });
  }
  const { data: mem } = await supabase
    .from("scheme_memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("scheme_id", c.scheme_id)
    .maybeSingle();
  if (!mem || !isLeadershipRole((mem as { role: string }).role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const service = createServiceClient();
  const { error: uErr } = await service
    .from("communications")
    .update({ inbox_labels: labels, updated_at: new Date().toISOString() })
    .eq("id", c.id)
    .eq("scheme_id", c.scheme_id);
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 });

  await audit({
    action: "inbox_labels_updated",
    entityType: "communications",
    entityId: c.id,
    schemeId: c.scheme_id,
    metadata: { labels },
  });
  return NextResponse.json({ ok: true, labels });
}
