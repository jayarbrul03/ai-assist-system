import { redirect } from "next/navigation";
import { getActiveScheme } from "@/lib/scheme";
import { PageShell, PageHeader } from "@/components/shared/page-header";
import { NewInvestigationForm } from "./form";
import { LegalLodgementWarning } from "@/components/ui/legal-warning";

export default async function NewInvestigationPage() {
  const ctx = await getActiveScheme();
  if (!ctx) redirect("/login");
  if (!ctx.scheme) redirect("/onboarding");

  const role = ctx.membership?.role ?? "owner";
  const isLeadership =
    role === "committee_chair" ||
    role === "committee_member" ||
    role === "manager";
  if (!isLeadership) redirect("/investigations");

  return (
    <PageShell>
      <PageHeader
        title="Open an investigation"
        description="Initiate a structured data request for an insurance claim, BCCM dispute, or internal review."
      />
      <LegalLodgementWarning className="mb-6" />
      <NewInvestigationForm schemeId={ctx.scheme.id} />
    </PageShell>
  );
}
