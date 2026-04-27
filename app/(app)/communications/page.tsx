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
import { formatDateTime, daysUntil } from "@/lib/utils";
import { Plus } from "lucide-react";
import { stageLabel, stageOrder } from "@/lib/comms";

export default async function CommsListPage() {
  const ctx = await getActiveScheme();
  if (!ctx) redirect("/login");
  if (!ctx.scheme) redirect("/onboarding");

  const supabase = await createClient();
  const { data: comms } = await supabase
    .from("communications")
    .select("*")
    .eq("scheme_id", ctx.scheme.id)
    .order("created_at", { ascending: false });

  console.log("schemeId", ctx.scheme.id);

  const list = (comms ?? []) as Array<{
    id: string;
    thread_id: string | null;
    subject: string | null;
    stage: string;
    status: string;
    created_at: string;
    served_at: string | null;
    response_deadline: string | null;
    to_party: string | null;
  }>;

  // Group by thread
  const threads = new Map<string, typeof list>();
  for (const c of list) {
    const key = c.thread_id ?? c.id;
    if (!threads.has(key)) threads.set(key, []);
    threads.get(key)!.push(c);
  }

  return (
    <PageShell>
      <PageHeader
        title="Communications"
        description="Procedural fairness, enforced by the system."
        action={
          <Button asChild>
            <Link href="/communications/new">
              <Plus className="h-4 w-4" /> New draft
            </Link>
          </Button>
        }
      />

      {threads.size === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-neutral-500">
            No communications yet. Start with a Stage 1 Friendly FYI.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Array.from(threads.entries()).map(([tid, items]) => {
            const latest = items.reduce((a, b) =>
              new Date(a.created_at) > new Date(b.created_at) ? a : b,
            );
            const maxStage = Math.max(...items.map((i) => stageOrder(i.stage)));
            return (
              <Card key={tid}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-base">
                        {latest.subject || "(no subject)"}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        To {latest.to_party ?? "—"} · {formatDateTime(latest.created_at)}
                      </CardDescription>
                    </div>
                    <ThreadStageDots maxStage={maxStage} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <ul className="divide-y divide-neutral-100">
                    {items
                      .sort((a, b) => stageOrder(a.stage) - stageOrder(b.stage))
                      .map((it) => {
                        const d = daysUntil(it.response_deadline);
                        const overdue = d !== null && d < 0;
                        return (
                          <li
                            key={it.id}
                            className="py-3 flex items-center gap-3 flex-wrap"
                          >
                            <Badge
                              variant={
                                it.status === "served"
                                  ? "default"
                                  : it.status === "resolved"
                                  ? "success"
                                  : "secondary"
                              }
                            >
                              {it.status}
                            </Badge>
                            <span className="text-sm">{stageLabel(it.stage)}</span>
                            {it.response_deadline ? (
                              <Badge variant={overdue ? "danger" : "outline"}>
                                {overdue ? `${Math.abs(d!)}d overdue` : `${d}d to respond`}
                              </Badge>
                            ) : null}
                            <Link
                              href={`/communications/${it.id}`}
                              className="ml-auto text-sm text-teal-700 hover:underline"
                            >
                              Open
                            </Link>
                          </li>
                        );
                      })}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

function ThreadStageDots({ maxStage }: { maxStage: number }) {
  return (
    <div className="flex items-center gap-1 text-xs text-neutral-500">
      {[1, 2, 3, 4].map((n) => (
        <span
          key={n}
          className={`h-2.5 w-2.5 rounded-full ${
            n <= maxStage ? "bg-teal-700" : "bg-neutral-200"
          }`}
          aria-hidden
        />
      ))}
      <span className="ml-1">Stage {maxStage} of 4</span>
    </div>
  );
}
