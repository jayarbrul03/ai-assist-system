/**
 * Auto-create a default scheme + membership for the signed-in user when
 * they land on the dashboard without one. Zero clicks.
 *
 * Role follows `onboarding_role` in user metadata (set at signup); else owner.
 */

import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { defaultSchemeRoleForNewUser } from "@/lib/auth/onboarding-role";

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

  const membershipRole = defaultSchemeRoleForNewUser(user.user_metadata);

  const service = createServiceClient();
  const { data: scheme, error: schemeErr } = await service
    .from("schemes")
    .insert({
      name: `${fullName}'s scheme — ${shortDate}`,
      jurisdiction: "QLD",
      governing_act: "BCCM 1997",
      onboarded_by: user.id,
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
    role: membershipRole,
    verified: true,
  });

  return NextResponse.json({ schemeId: scheme.id, created: true });
}
