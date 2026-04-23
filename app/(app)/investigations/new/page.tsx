import { PageShell, PageHeader } from "@/components/shared/page-header";
import { NewInvestigationForm } from "./form";
import { LegalLodgementWarning } from "@/components/ui/legal-warning";
import { requireLeadership } from "@/lib/require-leadership";

export default async function NewInvestigationPage() {
  const ctx = await requireLeadership("/investigations");

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
