import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const { schemeId, policy } = (await req.json()) as {
    schemeId: string;
    policy: "ask" | "fast_release" | "refuse";
  };

  const { error } = await supabase
    .from("scheme_memberships")
    .update({ investigation_default_policy: policy })
    .eq("user_id", user.id)
    .eq("scheme_id", schemeId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await audit({
    action: "issue_updated",
    entityType: "scheme_memberships",
    schemeId,
    metadata: { kind: "privacy_policy", policy },
  });

  return NextResponse.json({ ok: true });
}
