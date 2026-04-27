import Link from "next/link";
import { requireLeadership } from "@/lib/require-leadership";
import { createClient } from "@/lib/supabase/server";
import { PageShell, PageHeader } from "@/components/shared/page-header";
import { InboxApp, type InboxListRow } from "@/components/inbox/inbox-app";

export default async function InboxPage() {
  const ctx = await requireLeadership();
  const schemeId = ctx.scheme!.id;

  const supabase = await createClient();
  const [{ data: comms }, { data: recs }] = await Promise.all([
    supabase
      .from("communications")
      .select(
        "id, subject, to_party, status, stage, from_user, response_deadline, created_at, updated_at, served_at, inbox_labels",
      )
      .eq("scheme_id", schemeId)
      .in("to_party", ["committee", "manager"])
      .order("updated_at", { ascending: false })
      .limit(100),
    supabase
      .from("records_requests")
      .select("id, status, request_type, submitted_at, statutory_deadline, created_at, updated_at")
      .eq("scheme_id", schemeId)
      .order("updated_at", { ascending: false })
      .limit(100),
  ]);

  const rows: InboxListRow[] = [
    ...(comms ?? []).map((c) => {
      const r = c as {
        id: string;
        subject: string | null;
        to_party: string | null;
        status: string;
        stage: string;
        from_user: string;
        response_deadline: string | null;
        updated_at: string;
        served_at: string | null;
        created_at: string;
        inbox_labels?: string[] | null;
      };
      const sortAt = r.served_at ?? r.updated_at ?? r.created_at;
      return {
        kind: "comms" as const,
        id: r.id,
        sortAt,
        subject: r.subject,
        to_party: r.to_party,
        status: r.status,
        stage: r.stage,
        from_user: r.from_user,
        response_deadline: r.response_deadline,
        inbox_labels: r.inbox_labels ?? [],
      };
    }),
    ...(recs ?? []).map((x) => {
      const r = x as {
        id: string;
        status: string;
        request_type: string[];
        submitted_at: string | null;
        statutory_deadline: string | null;
        updated_at: string;
        created_at: string;
      };
      return {
        kind: "records" as const,
        id: r.id,
        sortAt: r.submitted_at ?? r.updated_at ?? r.created_at,
        status: r.status,
        request_type: r.request_type,
        submitted_at: r.submitted_at,
        statutory_deadline: r.statutory_deadline,
      };
    }),
  ];

  rows.sort((a, b) => (a.sortAt < b.sortAt ? 1 : a.sortAt > b.sortAt ? -1 : 0));

  return (
    <PageShell>
      <PageHeader
        title="Inbox"
        description="Committee and manager: tenant and lot-owner messages to the body corporate, plus records work—organised by queue, not one flat list."
        disclaimer={false}
      />
{/* 
      <div className="mb-4 rounded-lg border border-teal-200 bg-white px-3 py-2.5 text-sm text-neutral-800 shadow-sm sm:px-4 sm:py-3">
        <strong>High-volume scheme?</strong> Use the <strong>left queues</strong> (Intake → Urgent
        → Working → Closed), then <strong>folders</strong> and <strong>labels</strong>. Run
        migration{" "}
        <code className="text-xs bg-neutral-100 px-1 rounded">20260425120000_inbox_labels.sql</code>{" "}
        if <code className="text-xs bg-neutral-100 px-1">inbox_labels</code> errors.{" "}
        <Link className="text-teal-700 underline" href="/chat">
          The Brain
        </Link>{" "}
        = by-law Q&amp;A.
      </div> */}

      <InboxApp rows={rows} />
    </PageShell>
  );
}
