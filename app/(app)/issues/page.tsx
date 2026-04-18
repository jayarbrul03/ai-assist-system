import { redirect } from "next/navigation";
import { getActiveScheme } from "@/lib/scheme";
import { createClient } from "@/lib/supabase/server";
import { PageShell, PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { IssuesView } from "./issues-view";

export default async function IssuesPage() {
  const ctx = await getActiveScheme();
  if (!ctx) redirect("/login");
  if (!ctx.scheme) redirect("/onboarding");

  const supabase = await createClient();
  const { data: issues } = await supabase
    .from("legal_issues")
    .select("*")
    .eq("scheme_id", ctx.scheme.id)
    .order("created_at", { ascending: false });

  const { data: evidence } = await supabase
    .from("evidence_items")
    .select("id, description, occurred_at, issue_flags")
    .eq("scheme_id", ctx.scheme.id)
    .order("occurred_at", { ascending: false, nullsFirst: false })
    .limit(100);

  return (
    <PageShell>
      <PageHeader
        title="Legal Issue Register"
        description="Issues are possibilities, not conclusions. Confidence and next-step are captured per issue."
      />
      <IssuesView
        schemeId={ctx.scheme.id}
        issues={(issues ?? []) as Array<{
          id: string;
          issue_type: string | null;
          headline: string | null;
          detail: string | null;
          related_evidence_ids: string[];
          status: string;
          confidence: string;
          next_step: string | null;
          created_at: string;
        }>}
        evidence={(evidence ?? []) as Array<{
          id: string;
          description: string | null;
          occurred_at: string | null;
          issue_flags: string[] | null;
        }>}
      />
    </PageShell>
  );
}
