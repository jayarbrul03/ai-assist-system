import { redirect } from "next/navigation";
import Link from "next/link";
import { getActiveScheme } from "@/lib/scheme";
import { createClient } from "@/lib/supabase/server";
import { PageShell, PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";

const LANES = [
  { key: "parking", label: "Parking", match: (it: LaneItem) => hasAny(it, ["towing_pressure", "signage"]) || /park|tow/i.test(it.description ?? "") },
  { key: "notices", label: "Notices", match: (it: LaneItem) => it.source === "notice" || /notice|warning/i.test(it.description ?? "") },
  { key: "committee", label: "Committee Conduct", match: (it: LaneItem) => hasAny(it, ["overreach", "procedural_defect", "invalid_direction"]) },
  { key: "public", label: "Public Posts", match: (it: LaneItem) => it.source === "facebook_post" || hasAny(it, ["reputational_targeting"]) },
  { key: "impact", label: "Impact", match: (it: LaneItem) => (it.impact_flags ?? []).length > 0 },
];

interface LaneItem {
  id: string;
  description: string | null;
  source: string | null;
  occurred_at: string | null;
  impact_flags: string[] | null;
  issue_flags: string[] | null;
  confidence: string;
}

function hasAny(it: LaneItem, tags: string[]) {
  const all = [...(it.issue_flags ?? []), ...(it.impact_flags ?? [])];
  return all.some((x) => tags.includes(x));
}

export default async function TimelinePage() {
  const ctx = await getActiveScheme();
  if (!ctx) redirect("/login");
  if (!ctx.scheme) redirect("/onboarding");

  const supabase = await createClient();
  const { data: items } = await supabase
    .from("evidence_items")
    .select("id, description, source, occurred_at, impact_flags, issue_flags, confidence")
    .eq("scheme_id", ctx.scheme.id)
    .not("occurred_at", "is", null)
    .order("occurred_at", { ascending: false });

  const all = (items ?? []) as LaneItem[];

  return (
    <PageShell>
      <PageHeader
        title="Timeline"
        description="Chronological record, organised by theme. Only items with a date appear."
        action={
          <Link
            href="/export"
            className="text-sm font-medium text-teal-700 hover:underline"
          >
            Export as PDF →
          </Link>
        }
      />

      {all.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-neutral-500">
            No dated evidence yet.{" "}
            <Link href="/evidence/new" className="text-teal-700 underline">
              Add some
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {LANES.map((lane) => {
            const rows = all.filter(lane.match);
            if (rows.length === 0) return null;
            return (
              <section key={lane.key}>
                <h2 className="font-serif-brand text-xl font-semibold mb-3">
                  {lane.label}{" "}
                  <span className="text-sm text-neutral-400 font-normal">
                    ({rows.length})
                  </span>
                </h2>
                <ol className="space-y-3 border-l-2 border-neutral-200 pl-4">
                  {rows.map((r) => (
                    <li key={r.id} className="relative">
                      <span className="absolute -left-[21px] top-2 h-3 w-3 rounded-full bg-teal-700" />
                      <Link
                        href={`/evidence/${r.id}`}
                        className="block rounded-lg border border-neutral-200 bg-white p-4 hover:bg-neutral-50"
                      >
                        <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
                          <span>{formatDateTime(r.occurred_at)}</span>
                          <Badge variant="secondary">{r.source || "note"}</Badge>
                        </div>
                        <p className="text-sm text-neutral-800 leading-snug">
                          {r.description || "(no description)"}
                        </p>
                        {(r.issue_flags ?? []).length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {(r.issue_flags ?? []).map((f) => (
                              <Badge key={f} variant="warning" className="text-[10px]">
                                {f.replace(/_/g, " ")}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ol>
              </section>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
