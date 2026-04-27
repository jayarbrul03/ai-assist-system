import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isLeadershipRole } from "@/lib/roles";
import { draftInboxReply } from "@/lib/claude/inbox-draft-reply";
import { checkRateLimit } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const maxDuration = 60;

const INBOUND = ["committee", "manager"] as const;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const { communicationId } = (await req.json()) as { communicationId?: string };
  if (!communicationId) {
    return NextResponse.json({ error: "missing communicationId" }, { status: 400 });
  }

  const rl = await checkRateLimit(user.id, "inbox_draft_reply");
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Daily draft reply limit reached (${rl.limit}).` },
      { status: 429 },
    );
  }

  const { data: comm, error: cErr } = await supabase
    .from("communications")
    .select("id, scheme_id, subject, body, to_party, status")
    .eq("id", communicationId)
    .maybeSingle();
  if (cErr || !comm) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const c = comm as {
    id: string;
    scheme_id: string;
    subject: string | null;
    body: string | null;
    to_party: string | null;
  };
  if (!c.to_party || !INBOUND.includes(c.to_party as (typeof INBOUND)[number])) {
    return NextResponse.json({ error: "not an inbound item" }, { status: 400 });
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
  const svc = createServiceClient();
  const { data: sch } = await svc.from("schemes").select("name").eq("id", c.scheme_id).single();
  const schemeName = (sch as { name: string } | null)?.name ?? "Scheme";
  const draft = await draftInboxReply({
    schemeName,
    originalSubject: c.subject,
    originalBody: c.body,
    toParty: c.to_party,
  });
  await audit({
    action: "inbox_draft_reply",
    entityType: "communications",
    entityId: c.id,
    schemeId: c.scheme_id,
    metadata: { subject_len: draft.subject.length },
  });
  return NextResponse.json(draft);
}
