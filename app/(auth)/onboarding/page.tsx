import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * Zero-friction onboarding: if the user has no scheme, create a default one
 * and send them straight to the dashboard. They fill in details later from
 * Settings. No wizard, no form, no friction.
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

    const service = createServiceClient();
    const { data: scheme } = await service
      .from("schemes")
      .insert({
        name: `${fullName}'s scheme — ${shortDate}`,
        jurisdiction: "QLD",
        governing_act: "BCCM 1997",
        onboarded_by: user.id,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (scheme?.id) {
      await service.from("scheme_memberships").insert({
        user_id: user.id,
        scheme_id: scheme.id,
        role: "owner",
        verified: true,
      });
    }
  }

  redirect("/dashboard");
}
