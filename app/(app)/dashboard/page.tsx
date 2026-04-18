import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveScheme } from "@/lib/scheme";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DisclaimerStrip } from "@/components/ui/disclaimer";
import { daysUntil, formatDate } from "@/lib/utils";
import { Download, Plus } from "lucide-react";

export default async function DashboardPage() {
  const ctx = await getActiveScheme();
  if (!ctx) redirect("/login");
  if (!ctx.scheme) redirect("/onboarding");

  const supabase = await createClient();
  const schemeId = ctx.scheme.id;

  const [{ count: evidenceCount }, { count: openIssues }, { data: pendingComms }, { data: activeRecords }] =
    await Promise.all([
      supabase
        .from("evidence_items")
        .select("id", { count: "exact", head: true })
        .eq("scheme_id", schemeId),
      supabase
        .from("legal_issues")
        .select("id", { count: "exact", head: true })
        .eq("scheme_id", schemeId)
        .eq("status", "open"),
      supabase
        .from("communications")
        .select("*")
        .eq("scheme_id", schemeId)
        .in("status", ["draft", "served", "acknowledged"])
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("records_requests")
        .select("*")
        .eq("scheme_id", schemeId)
        .in("status", ["submitted", "acknowledged"])
        .order("statutory_deadline", { ascending: true })
        .limit(5),
    ]);

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto">
      <header className="flex items-start justify-between mb-8">
        <div>
          <p className="text-xs uppercase tracking-widest text-neutral-500">
            {ctx.scheme.name} · {ctx.scheme.cms_number || "No CMS"}
          </p>
          <h1 className="font-serif-brand text-3xl font-semibold mt-1">Dashboard</h1>
        </div>
        <Button asChild>
          <Link href="/export">
            <Download className="h-4 w-4" /> Export Case File
          </Link>
        </Button>
      </header>

      <DisclaimerStrip className="mb-8" compact />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Evidence items" value={evidenceCount ?? 0} href="/evidence" cta="View vault" />
        <StatCard label="Open issues" value={openIssues ?? 0} href="/issues" cta="Review issues" />
        <Card>
          <CardHeader>
            <CardDescription>Balance Score</CardDescription>
            <CardTitle className="text-3xl text-neutral-300">—</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">Coming soon</Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending communications</CardTitle>
            <CardDescription>Drafts and served notices awaiting response</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingComms?.length ? (
              <ul className="space-y-3">
                {pendingComms.map((c) => (
                  <li key={c.id} className="flex items-center justify-between border-b border-neutral-100 pb-2 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{c.subject || "(no subject)"}</p>
                      <p className="text-xs text-neutral-500">{stageLabel(c.stage)}</p>
                    </div>
                    <Badge variant={c.status === "served" ? "default" : "secondary"}>
                      {c.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyCTA href="/communications/new" label="Draft a communication" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Records requests</CardTitle>
            <CardDescription>7-day statutory deadline tracker</CardDescription>
          </CardHeader>
          <CardContent>
            {activeRecords?.length ? (
              <ul className="space-y-3">
                {activeRecords.map((r) => {
                  const d = daysUntil(r.statutory_deadline);
                  const overdue = d !== null && d < 0;
                  return (
                    <li key={r.id} className="flex items-center justify-between border-b border-neutral-100 pb-2 last:border-0">
                      <div>
                        <p className="text-sm font-medium">{(r.request_type || []).join(", ") || "Records request"}</p>
                        <p className="text-xs text-neutral-500">Due {formatDate(r.statutory_deadline)}</p>
                      </div>
                      <Badge variant={overdue ? "danger" : d !== null && d <= 2 ? "warning" : "secondary"}>
                        {d === null ? "—" : overdue ? `${Math.abs(d)}d overdue` : `${d}d left`}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyCTA href="/records/new" label="Draft a records request" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  cta,
}: {
  label: string;
  value: number;
  href: string;
  cta: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <Button asChild variant="ghost" size="sm">
          <Link href={href}>{cta}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyCTA({ href, label }: { href: string; label: string }) {
  return (
    <Button asChild variant="outline" size="sm">
      <Link href={href}>
        <Plus className="h-4 w-4" /> {label}
      </Link>
    </Button>
  );
}

function stageLabel(s: string | null): string {
  if (!s) return "";
  if (s === "stage_1_fyi") return "Stage 1 — Friendly FYI";
  if (s === "stage_2_formal_notice") return "Stage 2 — Formal Notice";
  if (s === "stage_3_contravention_notice") return "Stage 3 — Contravention Notice";
  if (s === "stage_4_enforcement") return "Stage 4 — Enforcement";
  return s;
}
