/**
 * Auto-create a default scheme + membership for the signed-in user when
 * they land on the dashboard without one. Zero clicks.
 *
 * Scheme gets a friendly auto-name; user fills in CMS/CTS/address later
 * from Settings. Keeps first-run UX to: signup → straight into the app.
 */

import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  // If user already has any membership, just return that.
  const { data: existing } = await supabase
    .from("scheme_memberships")
    .select("scheme_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (existing?.scheme_id) {
    return NextResponse.json({ schemeId: existing.scheme_id, created: false });
  }

  const fullName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.email ? user.email.split("@")[0] : "Member");
  const shortDate = new Date().toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const service = createServiceClient();
  const { data: scheme, error: schemeErr } = await service
    .from("schemes")
    .insert({
      name: `${fullName}'s scheme — ${shortDate}`,
      jurisdiction: "QLD",
      governing_act: "BCCM 1997",
      onboarded_by: user.id,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (schemeErr || !scheme) {
    return NextResponse.json(
      { error: schemeErr?.message ?? "insert failed" },
      { status: 500 },
    );
  }

  await service.from("scheme_memberships").insert({
    user_id: user.id,
    scheme_id: scheme.id,
    role: "owner",
    verified: true,
  });

  return NextResponse.json({ schemeId: scheme.id, created: true });
}
