import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

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

  const { data, error } = await supabase
    .from("scheme_announcements")
    .select("*")
    .eq("scheme_id", schemeId)
    .order("pinned", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const body = (await req.json()) as {
    schemeId: string;
    title: string;
    body: string;
    tone?: "positive" | "info" | "meeting" | "reminder" | "urgent";
    pinned?: boolean;
  };

  if (!body?.schemeId || !body?.title || !body?.body) {
    return NextResponse.json(
      { error: "schemeId, title and body required" },
      { status: 400 },
    );
  }

  // Verify leadership role
  const { data: membership } = await supabase
    .from("scheme_memberships")
    .select("role")
    .eq("user_id", user.id)
    .eq("scheme_id", body.schemeId)
    .maybeSingle();

  const role = (membership as { role?: string } | null)?.role;
  if (!role || !["committee_chair", "committee_member", "manager"].includes(role)) {
    return NextResponse.json(
      { error: "only committee or manager may publish announcements" },
      { status: 403 },
    );
  }

  const { data, error } = await supabase
    .from("scheme_announcements")
    .insert({
      scheme_id: body.schemeId,
      posted_by: user.id,
      title: body.title,
      body: body.body,
      tone: body.tone ?? "info",
      pinned: !!body.pinned,
      ai_reviewed: false,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await audit({
    action: "comms_served",
    entityType: "scheme_announcements",
    entityId: (data as { id: string }).id,
    schemeId: body.schemeId,
    metadata: { kind: "announcement", tone: body.tone },
  });

  return NextResponse.json({ announcement: data });
}
