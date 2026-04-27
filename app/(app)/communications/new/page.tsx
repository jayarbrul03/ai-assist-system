import { redirect } from "next/navigation";
import { getActiveScheme } from "@/lib/scheme";
import { createClient } from "@/lib/supabase/server";
import { PageShell, PageHeader } from "@/components/shared/page-header";
import { NewCommsForm } from "./form";
import { stageLabel } from "@/lib/comms";
import { consoleLoggingIntegration } from "@sentry/nextjs";

export default async function NewCommsPage({
  searchParams,
}: {
  searchParams: Promise<{ after?: string }>;
}) {
  const ctx = await getActiveScheme();
  if (!ctx) redirect("/login");
  if (!ctx.scheme) redirect("/onboarding");

  console.log("ctx", ctx.scheme.id);

  const sp = await searchParams;
  const afterId = sp.after?.trim() || null;
  const supabase = await createClient();

  let threadRootId: string | null = null;
  let priorStageSummary: string | null = null;

  if (afterId) {
    const { data: prior } = await supabase
      .from("communications")
      .select("id, scheme_id, thread_id, body, subject, stage")
      .eq("id", afterId)
      .maybeSingle();

    const p = prior as {
      id: string;
      scheme_id: string;
      thread_id: string | null;
      body: string | null;
      subject: string | null;
      stage: string;
    } | null;

    if (p && p.scheme_id === ctx.scheme.id) {
      threadRootId = p.thread_id ?? p.id;
      const body = (p.body ?? "").slice(0, 1200);
      priorStageSummary = `Previous message (${stageLabel(p.stage)}): ${p.subject ?? "(no subject)"}\n\n${body}`;
    }
  }

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
      {priorStageSummary ? (
        <p className="text-sm text-neutral-600 mb-4 rounded-lg border border-teal-200 bg-teal-50/60 px-3 py-2">
          This follow-up is linked to an existing thread. The next draft can use the prior message as
          context.
        </p>
      ) : null}
      <NewCommsForm
        schemeId={ctx.scheme.id}
        schemeName={ctx.scheme.name}
        threadRootId={threadRootId}
        priorStageSummary={priorStageSummary}
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
