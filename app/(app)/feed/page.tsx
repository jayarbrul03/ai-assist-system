import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveScheme } from "@/lib/scheme";
import { createClient } from "@/lib/supabase/server";
import { PageShell, PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { FeedTimeline, FeedIntroCard } from "@/components/feed/feed-timeline";
import { isLeadershipRole } from "@/lib/roles";
import type { FeedItem } from "@/lib/feed/types";

export default async function FeedPage() {
  const ctx = await getActiveScheme();
  if (!ctx) redirect("/login");
  if (!ctx.scheme) redirect("/onboarding");

  const schemeId = ctx.scheme.id;
  const userId = ctx.user.id;
  const role = ctx.membership?.role ?? "owner";
  const isLeadership = isLeadershipRole(role);

  const supabase = await createClient();
  const [{ data: ann }, { data: comms }, { data: recs }] = await Promise.all([
    supabase
      .from("scheme_announcements")
      .select("id, title, body, tone, pinned, published_at")
      .eq("scheme_id", schemeId)
      .order("pinned", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(50),
    supabase
      .from("communications")
      .select("id, subject, to_party, status, stage, from_user, updated_at")
      .eq("scheme_id", schemeId)
      .order("updated_at", { ascending: false })
      .limit(80),
    supabase
      .from("records_requests")
      .select("id, status, request_type, updated_at")
      .eq("scheme_id", schemeId)
      .order("updated_at", { ascending: false })
      .limit(50),
  ]);

  const items: FeedItem[] = [];

  for (const a of ann ?? []) {
    const r = a as {
      id: string;
      title: string;
      body: string;
      tone: string;
      pinned: boolean;
      published_at: string;
    };
    items.push({
      kind: "announcement",
      id: r.id,
      at: r.published_at,
      title: r.title,
      body: r.body,
      tone: r.tone,
      pinned: r.pinned,
    });
  }
  for (const c of comms ?? []) {
    const r = c as {
      id: string;
      subject: string | null;
      to_party: string | null;
      status: string;
      stage: string;
      from_user: string;
      updated_at: string;
    };
    items.push({
      kind: "comms",
      id: r.id,
      at: r.updated_at,
      subject: r.subject,
      status: r.status,
      to_party: r.to_party,
      stage: r.stage,
      isOutbound: r.from_user === userId,
    });
  }
  for (const x of recs ?? []) {
    const r = x as { id: string; status: string; request_type: string[] | null; updated_at: string };
    items.push({
      kind: "records",
      id: r.id,
      at: r.updated_at,
      status: r.status,
      request_type: r.request_type ?? [],
    });
  }

  items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  const merged = items.slice(0, 100);

  return (
    <PageShell>
      <PageHeader
        title="Feed"
        description="One timeline: scheme announcements, communications you’re allowed to see, and your records activity—newest first."
        disclaimer={false}
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        }
      />
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 text-sm text-neutral-600">
        <p>
          <span className="text-neutral-500">Also:</span>{" "}
          <Link className="text-teal-800 underline" href="/announcements">
            Announcements
          </Link>
          <span className="mx-1.5 text-neutral-300" aria-hidden>
            ·
          </span>
          <Link className="text-teal-800 underline" href="/communications">
            Communications
          </Link>
          <span className="mx-1.5 text-neutral-300" aria-hidden>
            ·
          </span>
          <Link className="text-teal-800 underline" href="/records">
            Records
          </Link>
        </p>
      </div>
      <div className="space-y-6">
        <FeedIntroCard isLeadership={isLeadership} />
        <FeedTimeline items={merged} />
      </div>
    </PageShell>
  );
}
