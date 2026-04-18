import { redirect } from "next/navigation";
import { getActiveScheme } from "@/lib/scheme";
import { PageShell, PageHeader } from "@/components/shared/page-header";
import { NewRecordsForm } from "./form";

export default async function NewRecordsPage() {
  const ctx = await getActiveScheme();
  if (!ctx) redirect("/login");
  if (!ctx.scheme) redirect("/onboarding");

  return (
    <PageShell>
      <PageHeader
        title="New records request"
        description="BCCM-compliant. 7-day statutory deadline tracked once served."
      />
      <NewRecordsForm schemeId={ctx.scheme.id} />
    </PageShell>
  );
}
