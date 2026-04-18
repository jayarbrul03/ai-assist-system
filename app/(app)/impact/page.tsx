import { redirect } from "next/navigation";
import { getActiveScheme } from "@/lib/scheme";
import { createClient } from "@/lib/supabase/server";
import { PageShell, PageHeader } from "@/components/shared/page-header";
import { ImpactLogView } from "./impact-view";

export default async function ImpactPage() {
  const ctx = await getActiveScheme();
  if (!ctx) redirect("/login");
  if (!ctx.scheme) redirect("/onboarding");

  const supabase = await createClient();
  const since = new Date();
  since.setDate(since.getDate() - 365);

  const { data: entries } = await supabase
    .from("impact_entries")
    .select("*")
    .eq("user_id", ctx.user.id)
    .eq("scheme_id", ctx.scheme.id)
    .gte("log_date", since.toISOString().slice(0, 10))
    .order("log_date", { ascending: false });

  return (
    <PageShell>
      <PageHeader
        title="Impact Log"
        description="Daily check-in. Private to you. Tracks the human cost over time."
      />
      <ImpactLogView
        schemeId={ctx.scheme.id}
        entries={(entries ?? []) as Array<{
          id: string;
          log_date: string;
          anxiety_score: number | null;
          disturbance_score: number | null;
          bc_contact_occurred: boolean;
          monitoring_observed: boolean;
          signage_or_towing_pressure: boolean;
          family_anxiety: boolean;
          avoidance_of_premises: boolean;
          new_public_content: boolean;
          new_evidence_captured: boolean;
          summary: string | null;
          legal_relevance: string | null;
        }>}
      />
    </PageShell>
  );
}
