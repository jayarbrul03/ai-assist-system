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
import { LegalLodgementWarning } from "@/components/ui/legal-warning";
import { BASIS_LABEL, computeTierCounts } from "@/lib/investigations";
import { formatDate } from "@/lib/utils";
import { ConsentActions } from "./consent-actions";
import { Shield, Users } from "lucide-react";

export default async function InvestigationDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getActiveScheme();
  if (!ctx) redirect("/login");
  if (!ctx.scheme) redirect("/onboarding");

  const supabase = await createClient();

  const { data: inv } = await supabase
    .from("investigation_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!inv) notFound();

  const i = inv as {
    id: string;
    scheme_id: string;
    requested_by: string;
    basis: string;
    basis_detail: string | null;
    status: string;
    expires_at: string | null;
    scope_from: string | null;
    scope_to: string | null;
    created_at: string;
  };

  const role = ctx.membership?.role ?? "owner";
  const isLeadership =
    role === "committee_chair" ||
    role === "committee_member" ||
    role === "manager";

  // Non-leadership: show only their own consent
  const { data: myConsent } = await supabase
    .from("investigation_consents")
    .select("*")
    .eq("investigation_id", id)
    .eq("member_id", ctx.user.id)
    .maybeSingle();

  const counts = isLeadership
    ? await computeTierCounts(i.scheme_id, i.id)
    : null;

  return (
    <PageShell>
      <PageHeader
        title={
          BASIS_LABEL[i.basis as keyof typeof BASIS_LABEL] ?? "Investigation"
        }
        description={`Opened ${formatDate(i.created_at)}${
          i.basis_detail ? ` · ${i.basis_detail}` : ""
        }`}
        action={
          <Button asChild variant="outline">
            <Link href="/investigations">Back</Link>
          </Button>
        }
      />

      <LegalLodgementWarning className="mb-6" />

      {/* Non-leadership — your consent decision */}
      {!isLeadership && myConsent ? (
        <Card className="mb-6 border-amber-200">
          <CardHeader>
            <div className="flex items-start gap-3">
              <Shield className="h-4 w-4 text-teal-700 mt-1" />
              <div>
                <CardTitle className="text-base">
                  Your private data is being requested
                </CardTitle>
                <CardDescription className="mt-1">
                  You can release, release with redactions, or refuse. Refusing
                  has no automatic consequence — your committee and manager see
                  only aggregate counts, never your name or decision.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {(myConsent as { response: string }).response === "pending" ? (
              <ConsentActions investigationId={id} />
            ) : (
              <p className="text-sm">
                Your decision on this request:{" "}
                <Badge variant="secondary">
                  {(myConsent as { response: string }).response.replace(/_/g, " ")}
                </Badge>
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Leadership — tier counts + permanent shield */}
      {isLeadership && counts ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <TierCard
              level="1"
              label="Scheme-public"
              count={counts.tier1}
              status="ready"
              description="Available now — committee comms, announcements, records."
            />
            <TierCard
              level="2"
              label="Shared-to-scheme"
              count={counts.tier2}
              status="ready"
              description="Evidence that members have opted to share."
            />
            <TierCard
              level="3"
              label="Member-private"
              count={
                counts.tier3_pending +
                counts.tier3_released +
                counts.tier3_auto +
                counts.tier3_refused
              }
              status={counts.tier3_pending > 0 ? "pending" : "ready"}
              description={`${counts.tier3_released + counts.tier3_auto} released · ${counts.tier3_pending} pending · ${counts.tier3_refused} declined`}
            />
            <TierCard
              level="4"
              label="Wellbeing data"
              count={counts.tier4_blocked}
              status="blocked"
              description="Impact Log + private chats. Permanently shielded under any investigation. Protects every member."
            />
          </div>

          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-teal-700" />
                <CardTitle className="text-base">Consent status</CardTitle>
              </div>
              <CardDescription>
                Aggregate only. Parity does not show who released vs who
                refused — this protects members and prevents retaliation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3 text-center text-sm">
                <div>
                  <p className="text-2xl font-semibold tabular-nums text-neutral-900">
                    {counts.tier3_released + counts.tier3_auto}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">Released</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold tabular-nums text-amber-700">
                    {counts.tier3_pending}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">Pending</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold tabular-nums text-neutral-500">
                    {counts.tier3_refused}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">Declined</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold tabular-nums text-red-700">
                    {counts.tier4_blocked}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Shielded (Tier&nbsp;4)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Export bundle</CardTitle>
              <CardDescription>
                Download a watermarked ZIP of all released data. Every export
                is audit-logged and includes the legal warning on the cover.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-500">
                Export generation: developer TODO (bundle zip + cover PDF with
                basis, tier counts, legal warning, watermark). Data access + RLS
                complete. See <code>HANDOFF.md</code>.
              </p>
            </CardContent>
          </Card>
        </>
      ) : null}
    </PageShell>
  );
}

function TierCard({
  level,
  label,
  count,
  status,
  description,
}: {
  level: string;
  label: string;
  count: number;
  status: "ready" | "pending" | "blocked";
  description: string;
}) {
  const variant =
    status === "ready" ? "success" : status === "pending" ? "warning" : "danger";
  return (
    <Card
      className={
        status === "blocked"
          ? "border-red-200 bg-red-50/30"
          : status === "pending"
          ? "border-amber-200 bg-amber-50/30"
          : undefined
      }
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Badge variant={variant}>Tier {level}</Badge>
          <span className="text-2xl font-semibold tabular-nums">{count}</span>
        </div>
        <CardTitle className="text-sm mt-2">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-neutral-600 leading-snug">{description}</p>
      </CardContent>
    </Card>
  );
}
