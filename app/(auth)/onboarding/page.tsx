import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { defaultSchemeRoleForNewUser } from "@/lib/auth/onboarding-role";

/**
 * Zero-friction onboarding: if the user has no scheme, create a default one
 * and send them straight to the dashboard. They fill in details later from
 * Settings. Role comes from signup metadata (see /start → /signup?role=...).
 */
export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("scheme_memberships")
    .select("scheme_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!existing?.scheme_id) {
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
    const insertPayload: {
      name: string;
      jurisdiction: string;
      governing_act: string;
      onboarded_by: string;
    } = {
      name: `${fullName}'s scheme — ${shortDate}`,
      jurisdiction: "QLD",
      governing_act: "BCCM 1997",
      onboarded_by: user.id,
    };

    const { data: scheme } = await service
      .from("schemes")
      .insert(insertPayload)
      .select("id")
      .single();

    if (scheme?.id) {
      await service.from("scheme_memberships").insert({
        user_id: user.id,
        scheme_id: scheme.id,
        role: membershipRole,
        verified: true,
      });
    }
  }

  redirect("/dashboard");
}
