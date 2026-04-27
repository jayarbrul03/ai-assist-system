import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isLeadershipRole } from "@/lib/roles";
import { audit } from "@/lib/audit";
import type { CommsStatus } from "@/lib/supabase/types";

export const runtime = "nodejs";

const INBOUND: readonly string[] = ["committee", "manager"];

type Body = { communicationId: string; nextStatus: CommsStatus };

/**
 * Leadership-only: move inbound (to committee/manager) communication along the status workflow.
 * Uses service client after role + row checks (RLS only allows sender to update; inbound updates are here).
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const { communicationId, nextStatus } = (await req.json()) as Body;
  if (!communicationId || !nextStatus) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  const allowed: CommsStatus[] = ["acknowledged", "responded", "resolved", "escalated"];
  if (!allowed.includes(nextStatus)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const { data: row, error: fetchErr } = await supabase
    .from("communications")
    .select("id, scheme_id, to_party, status, from_user")
    .eq("id", communicationId)
    .maybeSingle();

  if (fetchErr || !row) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const c = row as {
    id: string;
    scheme_id: string;
    to_party: string | null;
    status: string;
    from_user: string;
  };

  const { data: mem } = await supabase
    .from("scheme_memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("scheme_id", c.scheme_id)
    .maybeSingle();

  if (!mem || !isLeadershipRole((mem as { role: string }).role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!c.to_party || !INBOUND.includes(c.to_party)) {
    return NextResponse.json({ error: "not an inbound item" }, { status: 400 });
  }
  if (c.status === "draft") {
    return NextResponse.json({ error: "not served yet" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const updates: Record<string, string> = { status: nextStatus, updated_at: now };
  if (nextStatus === "acknowledged") {
    updates.acknowledged_at = now;
  }
  if (nextStatus === "responded") {
    updates.responded_at = now;
  }

  const service = createServiceClient();
  const { error: upErr } = await service
    .from("communications")
    .update(updates)
    .eq("id", c.id)
    .eq("scheme_id", c.scheme_id);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }

  await audit({
    action: "comms_leadership_status",
    entityType: "communications",
    entityId: c.id,
    schemeId: c.scheme_id,
    metadata: { nextStatus, actor: user.id },
  });

  return NextResponse.json({ ok: true, status: nextStatus });
}
