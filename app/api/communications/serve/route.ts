import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { moderateDraft } from "@/lib/claude/comms";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const { communicationId, skipModeration } = (await req.json()) as {
    communicationId: string;
    skipModeration?: boolean;
  };

  const { data: comm } = await supabase
    .from("communications")
    .select("*")
    .eq("id", communicationId)
    .maybeSingle();

  if (!comm) return NextResponse.json({ error: "not found" }, { status: 404 });

  const c = comm as {
    id: string;
    from_user: string;
    scheme_id: string;
    body: string | null;
    stage: string;
    status: string;
  };

  if (c.from_user !== user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (c.status !== "draft") {
    return NextResponse.json({ error: "already served" }, { status: 400 });
  }

  // Content moderation
  if (!skipModeration && c.body) {
    const mod = await moderateDraft(c.body);
    if (mod.flagged && mod.overall_risk !== "low") {
      return NextResponse.json({ moderation: mod }, { status: 200 });
    }
  }

  const servedAt = new Date();
  const deadline = new Date(servedAt);
  deadline.setDate(deadline.getDate() + 14);

  const { error: upErr } = await supabase
    .from("communications")
    .update({
      status: "served",
      served_at: servedAt.toISOString(),
      response_deadline: deadline.toISOString(),
    })
    .eq("id", communicationId);

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  await audit({
    action: "comms_served",
    entityType: "communications",
    entityId: communicationId,
    schemeId: c.scheme_id,
    metadata: { stage: c.stage, served_at: servedAt.toISOString() },
  });

  return NextResponse.json({
    servedAt: servedAt.toISOString(),
    deadline: deadline.toISOString(),
  });
}
