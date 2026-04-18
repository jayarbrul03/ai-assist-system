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
import { formatDate, truncate } from "@/lib/utils";
import { Plus } from "lucide-react";

export default async function EvidenceListPage() {
  const ctx = await getActiveScheme();
  if (!ctx) redirect("/login");
  if (!ctx.scheme) redirect("/onboarding");

  const supabase = await createClient();
  const { data: items } = await supabase
    .from("evidence_items")
    .select("*")
    .eq("scheme_id", ctx.scheme.id)
    .order("occurred_at", { ascending: false, nullsFirst: false })
    .limit(200);

  const list = (items ?? []) as Array<{
    id: string;
    occurred_at: string | null;
    source: string | null;
    description: string | null;
    issue_flags: string[] | null;
    confidence: string;
    next_action: string;
    shared_with_scheme: boolean;
  }>;

  return (
    <PageShell>
      <PageHeader
        title="Evidence Vault"
        description="Private by default. You decide what to share."
        action={
          <Button asChild>
            <Link href="/evidence/new">
              <Plus className="h-4 w-4" /> Add evidence
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All items</CardTitle>
          <CardDescription>{list.length} records</CardDescription>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Nothing yet. Start by adding a screenshot, a photo, or pasting an email.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-neutral-500 border-b border-neutral-200">
                  <tr>
                    <th className="py-2 pr-4">Date</th>
                    <th className="pr-4">Source</th>
                    <th className="pr-4">Description</th>
                    <th className="pr-4">Flags</th>
                    <th className="pr-4">Confidence</th>
                    <th className="pr-4">Next</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((it) => (
                    <tr key={it.id} className="border-b border-neutral-100">
                      <td className="py-3 pr-4 align-top text-neutral-600">
                        {formatDate(it.occurred_at)}
                      </td>
                      <td className="pr-4 align-top">
                        <Badge variant="secondary">{it.source || "note"}</Badge>
                      </td>
                      <td className="pr-4 align-top max-w-sm">
                        {truncate(it.description, 120)}
                      </td>
                      <td className="pr-4 align-top">
                        <div className="flex flex-wrap gap-1">
                          {(it.issue_flags || []).slice(0, 3).map((f) => (
                            <Badge key={f} variant="warning" className="text-[10px]">
                              {f.replace(/_/g, " ")}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="pr-4 align-top">
                        <Badge
                          variant={
                            it.confidence === "confirmed"
                              ? "success"
                              : it.confidence === "likely"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {it.confidence}
                        </Badge>
                      </td>
                      <td className="pr-4 align-top">
                        <span className="text-xs text-neutral-700">
                          {(it.next_action || "").replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="align-top">
                        <Link
                          href={`/evidence/${it.id}`}
                          className="text-sm text-teal-700 hover:underline"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
