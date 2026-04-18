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
import { formatDateTime } from "@/lib/utils";

export default async function EvidenceDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getActiveScheme();
  if (!ctx) redirect("/login");
  if (!ctx.scheme) redirect("/onboarding");

  const supabase = await createClient();
  const { data: item } = await supabase
    .from("evidence_items")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!item) notFound();

  const ev = item as {
    id: string;
    occurred_at: string | null;
    location: string | null;
    source: string | null;
    description: string | null;
    exact_words: string | null;
    rule_cited: string | null;
    rule_source: string | null;
    people_involved: string[];
    impact_flags: string[];
    issue_flags: string[];
    confidence: string;
    next_action: string;
    ai_summary: string | null;
    shared_with_scheme: boolean;
    created_at: string;
  };

  return (
    <PageShell>
      <PageHeader
        title="Evidence item"
        description={ev.description ?? undefined}
        action={
          <Button asChild variant="outline">
            <Link href="/evidence">Back to vault</Link>
          </Button>
        }
      />

      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Summary</CardTitle>
            <CardDescription>AI-extracted + your edits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Occurred">{formatDateTime(ev.occurred_at)}</Row>
            <Row label="Location">{ev.location || "—"}</Row>
            <Row label="Source"><Badge variant="secondary">{ev.source || "note"}</Badge></Row>
            <Row label="Confidence"><Badge>{ev.confidence}</Badge></Row>
            <Row label="Next action">{(ev.next_action || "").replace(/_/g, " ")}</Row>
            <Row label="Shared">
              <Badge variant={ev.shared_with_scheme ? "default" : "secondary"}>
                {ev.shared_with_scheme ? "shared" : "private"}
              </Badge>
            </Row>
          </CardContent>
        </Card>

        {ev.description ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Neutral description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-800 whitespace-pre-wrap">{ev.description}</p>
            </CardContent>
          </Card>
        ) : null}

        {ev.exact_words ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Exact words</CardTitle>
              <CardDescription>Verbatim quote preserved</CardDescription>
            </CardHeader>
            <CardContent>
              <blockquote className="border-l-2 border-teal-700 pl-4 text-sm italic text-neutral-800 whitespace-pre-wrap">
                {ev.exact_words}
              </blockquote>
            </CardContent>
          </Card>
        ) : null}

        {ev.rule_cited ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Rule basis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Rule cited">{ev.rule_cited}</Row>
              <Row label="Rule source">
                <Badge variant="outline">{(ev.rule_source || "unknown").replace(/_/g, " ")}</Badge>
              </Row>
            </CardContent>
          </Card>
        ) : null}

        {(ev.impact_flags.length > 0 || ev.issue_flags.length > 0) ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Flags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ev.issue_flags.length > 0 ? (
                <div>
                  <p className="text-xs text-neutral-500 uppercase mb-1">Issue flags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ev.issue_flags.map((f) => (
                      <Badge key={f} variant="warning">{f.replace(/_/g, " ")}</Badge>
                    ))}
                  </div>
                </div>
              ) : null}
              {ev.impact_flags.length > 0 ? (
                <div>
                  <p className="text-xs text-neutral-500 uppercase mb-1">Impact flags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ev.impact_flags.map((f) => (
                      <Badge key={f} variant="outline">{f.replace(/_/g, " ")}</Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {ev.ai_summary ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-700 whitespace-pre-wrap">{ev.ai_summary}</p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </PageShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1 border-b border-neutral-100 last:border-0">
      <span className="text-neutral-500">{label}</span>
      <span className="text-neutral-900">{children}</span>
    </div>
  );
}
