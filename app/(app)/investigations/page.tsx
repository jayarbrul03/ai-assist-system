import { redirect } from "next/navigation";
import Link from "next/link";
import { getActiveScheme } from "@/lib/scheme";
import { createClient } from "@/lib/supabase/server";
import { PageShell, PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { LegalLodgementWarning } from "@/components/ui/legal-warning";
import { formatDate } from "@/lib/utils";
import { BASIS_LABEL } from "@/lib/investigations";
import { Gavel, Plus } from "lucide-react";

export default async function InvestigationsListPage() {
  const ctx = await getActiveScheme();
  if (!ctx) redirect("/login");
  if (!ctx.scheme) redirect("/onboarding");

  const supabase = await createClient();
  const role = ctx.membership?.role ?? "owner";
  const isLeadership =
    role === "committee_chair" ||
    role === "committee_member" ||
    role === "manager";

  // Investigations the user can see: open ones for their scheme (leadership),
  // plus their own consent rows (non-leadership).
  const { data: list } = await supabase
    .from("investigation_requests")
    .select("*")
    .eq("scheme_id", ctx.scheme.id)
    .order("created_at", { ascending: false });

  const investigations = (list ?? []) as Array<{
    id: string;
    basis: string;
    basis_detail: string | null;
    status: string;
    expires_at: string | null;
    tier3_pending_count: number;
    tier3_released_count: number;
    tier3_refused_count: number;
    created_at: string;
  }>;

  // Also pending consent requests that target this user
  const { data: pendingConsents } = await supabase
    .from("investigation_consents")
    .select("id, investigation_id, response, created_at")
    .eq("member_id", ctx.user.id)
    .eq("response", "pending");

  return (
    <PageShell>
      <PageHeader
        title="Investigations"
        description="Gated data releases. Scheme-public data is auto-available. Private data requires per-member consent. Personal wellbeing data is never released."
        action={
          isLeadership ? (
            <Button asChild>
              <Link href="/investigations/new">
                <Plus className="h-4 w-4" /> Open investigation
              </Link>
            </Button>
          ) : undefined
        }
      />

      {pendingConsents && pendingConsents.length > 0 ? (
        <Card className="mb-6 border-amber-200 bg-amber-50/40">
          <CardHeader>
            <CardTitle className="text-base">
              {pendingConsents.length} pending consent request
              {pendingConsents.length > 1 ? "s" : ""}
            </CardTitle>
            <CardDescription>
              Your committee or manager has requested access to your private
              scheme data. You choose: release, release redacted, or refuse.
              Refusing has no automatic consequence.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {pendingConsents.map((c) => (
                <li key={c.id}>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/investigations/${c.investigation_id}`}>
                      Review request →
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <LegalLodgementWarning className="mb-6" />

      {investigations.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-neutral-500">
            <Gavel className="h-5 w-5 mx-auto mb-2 text-neutral-400" />
            No investigations open. That&apos;s a good sign.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {investigations.map((i) => (
            <Card key={i.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">
                      {BASIS_LABEL[i.basis as keyof typeof BASIS_LABEL] ?? i.basis}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Opened {formatDate(i.created_at)}
                      {i.basis_detail ? ` · ${i.basis_detail}` : ""}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={
                      i.status === "open"
                        ? "warning"
                        : i.status === "completed"
                        ? "success"
                        : "secondary"
                    }
                  >
                    {i.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="secondary">
                    Tier 3 · {i.tier3_pending_count ?? 0} pending
                  </Badge>
                  <Badge variant="success">
                    {i.tier3_released_count ?? 0} released
                  </Badge>
                  <Badge variant="outline">
                    {i.tier3_refused_count ?? 0} refused
                  </Badge>
                  <Button asChild variant="ghost" size="sm" className="ml-auto">
                    <Link href={`/investigations/${i.id}`}>Open</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
