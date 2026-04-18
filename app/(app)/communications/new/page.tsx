import { redirect } from "next/navigation";
import { getActiveScheme } from "@/lib/scheme";
import { createClient } from "@/lib/supabase/server";
import { PageShell, PageHeader } from "@/components/shared/page-header";
import { NewCommsForm } from "./form";

export default async function NewCommsPage() {
  const ctx = await getActiveScheme();
  if (!ctx) redirect("/login");
  if (!ctx.scheme) redirect("/onboarding");

  const supabase = await createClient();
  const { data: evidence } = await supabase
    .from("evidence_items")
    .select("id, description, occurred_at, issue_flags")
    .eq("scheme_id", ctx.scheme.id)
    .order("occurred_at", { ascending: false, nullsFirst: false })
    .limit(50);

  return (
    <PageShell>
      <PageHeader
        title="New communication"
        description="Select a stage. Link evidence. Parity drafts a calm, factual, non-defamatory message."
      />
      <NewCommsForm
        schemeId={ctx.scheme.id}
        schemeName={ctx.scheme.name}
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
