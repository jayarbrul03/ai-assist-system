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
import { MarkFulfilled } from "./actions";

export default async function RecordsDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getActiveScheme();
  if (!ctx) redirect("/login");
  if (!ctx.scheme) redirect("/onboarding");

  const supabase = await createClient();
  const { data: rec } = await supabase
    .from("records_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!rec) notFound();

  const r = rec as {
    id: string;
    request_type: string[];
    specific_items: string | null;
    status: string;
    submitted_at: string | null;
    served_at: string | null;
    statutory_deadline: string | null;
    fulfilled_at: string | null;
    notes: string | null;
  };

  const d = daysUntil(r.statutory_deadline);
  const overdue = d !== null && d < 0 && !r.fulfilled_at;

  return (
    <PageShell>
      <PageHeader
        title="Records request"
        description={(r.request_type || []).join(", ")}
        action={
          <Button asChild variant="outline">
            <Link href="/records">Back</Link>
          </Button>
        }
      />
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status</CardTitle>
            <CardDescription>
              {r.fulfilled_at
                ? `Fulfilled ${formatDateTime(r.fulfilled_at)}`
                : overdue
                ? `${Math.abs(d!)}d past statutory deadline`
                : r.statutory_deadline
                ? `${d}d remaining until deadline`
                : "Not yet served"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3 items-center text-sm">
            <Badge variant={r.fulfilled_at ? "success" : overdue ? "danger" : "secondary"}>
              {r.fulfilled_at ? "fulfilled" : overdue ? "overdue" : r.status}
            </Badge>
            <span>Submitted {formatDateTime(r.submitted_at)}</span>
            <span>Served {formatDateTime(r.served_at)}</span>
            <span>Deadline {formatDateTime(r.statutory_deadline)}</span>
          </CardContent>
        </Card>

        {r.specific_items ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Specific items</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-800 whitespace-pre-wrap">
                {r.specific_items}
              </p>
            </CardContent>
          </Card>
        ) : null}

        {r.notes ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Draft / correspondence</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
                {r.notes}
              </pre>
            </CardContent>
          </Card>
        ) : null}

        {!r.fulfilled_at ? <MarkFulfilled id={r.id} /> : null}
      </div>
    </PageShell>
  );
}
