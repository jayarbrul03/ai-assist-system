import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveScheme } from "@/lib/scheme";
import { createClient } from "@/lib/supabase/server";
import { PageShell, PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isManagerRole } from "@/lib/roles";
import { Activity, FileText, Flag, Inbox, Send, FolderLock, Megaphone } from "lucide-react";

export default async function ManagerCentrePage() {
  const ctx = await getActiveScheme();
  if (!ctx) redirect("/login");
  if (!ctx.scheme) redirect("/onboarding");
  if (!isManagerRole(ctx.membership?.role)) {
    redirect("/dashboard");
  }

  const schemeId = ctx.scheme.id;
  const supabase = await createClient();
  const [
    { count: commsOpen },
    { count: recsOpen },
    { count: issuesOpen },
    { count: evidenceN },
  ] = await Promise.all([
    supabase
      .from("communications")
      .select("id", { count: "exact", head: true })
      .eq("scheme_id", schemeId)
      .not("status", "eq", "resolved"),
    supabase
      .from("records_requests")
      .select("id", { count: "exact", head: true })
      .eq("scheme_id", schemeId)
      .in("status", ["submitted", "acknowledged", "draft"]),
    supabase
      .from("legal_issues")
      .select("id", { count: "exact", head: true })
      .eq("scheme_id", schemeId)
      .eq("status", "open"),
    supabase
      .from("evidence_items")
      .select("id", { count: "exact", head: true })
      .eq("scheme_id", schemeId),
  ]);

  const kpi = [
    { label: "Communications (non-resolved)", value: commsOpen ?? 0, href: "/communications", icon: Send },
    { label: "Records in flight", value: recsOpen ?? 0, href: "/records", icon: FileText },
    { label: "Open issues", value: issuesOpen ?? 0, href: "/issues", icon: Flag },
    { label: "Evidence items (scheme)", value: evidenceN ?? 0, href: "/evidence", icon: FolderLock },
  ] as const;

  return (
    <PageShell>
      <PageHeader
        title="Manager centre"
        description="Scheme-wide review: counts are indicative — what you can open still follows your permissions in Parity and RLS."
        disclaimer={false}
        action={
          <Button asChild>
            <Link href="/inbox">Open inbox</Link>
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-4xl">
        {kpi.map((k) => {
          const Icon = k.icon;
          return (
            <Link
              key={k.href + k.label}
              href={k.href}
              className="block rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-teal-200"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="h-4 w-4 text-teal-700 shrink-0" aria-hidden />
                  <span className="text-sm text-neutral-600 line-clamp-2">{k.label}</span>
                </div>
                <span className="text-2xl font-semibold tabular-nums text-neutral-900">
                  {k.value}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 max-w-4xl sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Inbox className="h-4 w-4" /> Inbox
            </CardTitle>
            <CardDescription>Queues, labels, and AI for inbound committee/manager mail.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/inbox">Go to inbox</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Megaphone className="h-4 w-4" /> Announce
            </CardTitle>
            <CardDescription>Scheme-wide posts for owners and tenants.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/announcements">Open announcements</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" /> Impact &amp; time
            </CardTitle>
            <CardDescription>Chronology and effect logging where used.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/impact">Impact log</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/timeline">Timeline</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Export</CardTitle>
            <CardDescription>Case file and PDF exports where available.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/export">Open export</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
