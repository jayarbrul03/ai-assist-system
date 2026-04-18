import Link from "next/link";
import { redirect } from "next/navigation";
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
import { formatDate, daysUntil } from "@/lib/utils";
import { Plus } from "lucide-react";

export default async function RecordsListPage() {
  const ctx = await getActiveScheme();
  if (!ctx) redirect("/login");
  if (!ctx.scheme) redirect("/onboarding");

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("records_requests")
    .select("*")
    .eq("scheme_id", ctx.scheme.id)
    .order("created_at", { ascending: false });

  const list = (rows ?? []) as Array<{
    id: string;
    request_type: string[];
    status: string;
    submitted_at: string | null;
    served_at: string | null;
    statutory_deadline: string | null;
    fulfilled_at: string | null;
  }>;

  return (
    <PageShell>
      <PageHeader
        title="Records requests"
        description="7-day statutory deadline tracked from the date the request is served and any fee paid."
        action={
          <Button asChild>
            <Link href="/records/new">
              <Plus className="h-4 w-4" /> New request
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All requests</CardTitle>
          <CardDescription>{list.length} records</CardDescription>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No requests yet. Draft one if you need minutes, correspondence, or CCTV footage.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {list.map((r) => {
                const d = daysUntil(r.statutory_deadline);
                const overdue = d !== null && d < 0 && !r.fulfilled_at;
                return (
                  <li key={r.id} className="py-4 flex items-start gap-3">
                    <div className="flex-1">
                      <Link
                        href={`/records/${r.id}`}
                        className="text-sm font-medium hover:underline"
                      >
                        {(r.request_type || []).join(", ") || "Records request"}
                      </Link>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Submitted {formatDate(r.submitted_at)} · Served{" "}
                        {formatDate(r.served_at)} · Deadline{" "}
                        {formatDate(r.statutory_deadline)}
                      </p>
                    </div>
                    <Badge variant={r.fulfilled_at ? "success" : overdue ? "danger" : "secondary"}>
                      {r.fulfilled_at
                        ? "fulfilled"
                        : overdue
                        ? `${Math.abs(d!)}d overdue`
                        : r.status}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
