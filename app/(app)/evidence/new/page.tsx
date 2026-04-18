import { redirect } from "next/navigation";
import { getActiveScheme } from "@/lib/scheme";
import { PageShell, PageHeader } from "@/components/shared/page-header";
import { NewEvidenceForm } from "./form";

export default async function NewEvidencePage() {
  const ctx = await getActiveScheme();
  if (!ctx) redirect("/login");
  if (!ctx.scheme) redirect("/onboarding");

  return (
    <PageShell>
      <PageHeader
        title="Add evidence"
        description="Upload a screenshot, photo, or paste an email. Parity extracts fact from emotion."
      />
      <NewEvidenceForm schemeId={ctx.scheme.id} />
    </PageShell>
  );
}
