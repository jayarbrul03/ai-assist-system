import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getActiveScheme } from "@/lib/scheme";
import { createClient } from "@/lib/supabase/server";
import { PageShell, PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { formatDateTime, daysUntil } from "@/lib/utils";
import { stageLabel } from "@/lib/comms";

export default async function CommsDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getActiveScheme();
  if (!ctx) redirect("/login");
  if (!ctx.scheme) redirect("/onboarding");

  const supabase = await createClient();
  const { data: comm } = await supabase
    .from("communications")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!comm) notFound();

  const c = comm as {
    id: string;
    subject: string | null;
    body: string | null;
    stage: string;
    status: string;
    served_at: string | null;
    response_deadline: string | null;
    to_party: string | null;
    to_party_email: string | null;
    bylaw_citations: string[];
    related_evidence_ids: string[];
    stage_skip_justification: string | null;
    created_at: string;
  };

  const d = daysUntil(c.response_deadline);
  const overdue = d !== null && d < 0;

  return (
    <PageShell>
      <PageHeader
        title={c.subject || "(no subject)"}
        description={`${stageLabel(c.stage)} · ${c.to_party ?? "—"}`}
        action={
          <Button asChild variant="outline">
            <Link href="/communications">Back</Link>
          </Button>
        }
      />

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3 items-center text-sm">
            <Badge
              variant={
                c.status === "served"
                  ? "default"
                  : c.status === "resolved"
                  ? "success"
                  : "secondary"
              }
            >
              {c.status}
            </Badge>
            {c.served_at ? (
              <span>Served {formatDateTime(c.served_at)}</span>
            ) : (
              <span className="text-neutral-500">Draft</span>
            )}
            {c.response_deadline ? (
              <Badge variant={overdue ? "danger" : "outline"}>
                {overdue ? `${Math.abs(d!)}d overdue` : `${d}d to respond`}
              </Badge>
            ) : null}
          </CardContent>
        </Card>

        {c.stage_skip_justification ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Stage-skip justification</CardTitle>
              <CardDescription>
                Recorded on the audit log for procedural fairness.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-800 whitespace-pre-wrap">
                {c.stage_skip_justification}
              </p>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Message</CardTitle>
            <CardDescription>
              To {c.to_party_email || c.to_party || "—"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
              {c.body ?? ""}
            </pre>
          </CardContent>
        </Card>

        {c.bylaw_citations?.length ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">By-law citations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {c.bylaw_citations.map((b) => (
                  <Badge key={b} variant="outline">
                    {b}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </PageShell>
  );
}
