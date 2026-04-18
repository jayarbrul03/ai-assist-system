import { redirect } from "next/navigation";
import { getActiveScheme } from "@/lib/scheme";
import { PageShell, PageHeader } from "@/components/shared/page-header";
import { ExportForm } from "./export-form";

export default async function ExportPage() {
  const ctx = await getActiveScheme();
  if (!ctx) redirect("/login");
  if (!ctx.scheme) redirect("/onboarding");

  return (
    <PageShell>
      <PageHeader
        title="Export case file"
        description="One PDF bundle: cover, executive summary, timeline, evidence, communications, records, issues, impact log, audit log."
      />
      <ExportForm schemeId={ctx.scheme.id} />
    </PageShell>
  );
}
