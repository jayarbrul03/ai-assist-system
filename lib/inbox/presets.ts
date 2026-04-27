import { daysUntil } from "@/lib/utils";

export const INBOX_LABEL_PRESETS = [
  { value: "parking", label: "Parking" },
  { value: "noise", label: "Noise" },
  { value: "pets", label: "Pets" },
  { value: "repairs", label: "Repairs" },
  { value: "by-laws", label: "By-laws" },
  { value: "records", label: "Records" },
  { value: "dispute", label: "Dispute" },
  { value: "towing", label: "Towing" },
  { value: "meeting", label: "Meeting" },
  { value: "general", label: "General" },
] as const;

export type SidebarQueue = "all" | "intake" | "urgent" | "working" | "closed";

export function isCommUrgent(
  status: string,
  response_deadline: string | null,
): boolean {
  if (status === "resolved" || status === "draft") return false;
  const d = daysUntil(response_deadline);
  return d !== null && (d < 0 || d <= 3);
}

export function matchesSidebarQueue(
  q: SidebarQueue,
  kind: "comms" | "records",
  status: string,
  response_deadline: string | null,
  statutory_deadline: string | null,
  submitted_at: string | null,
): boolean {
  if (q === "all") return true;
  if (kind === "records") {
    if (q === "closed") return status === "fulfilled";
    if (q === "intake") return status === "draft";
    if (q === "working" || q === "urgent") {
      if (status === "submitted") {
        if (q === "urgent") {
          const d = daysUntil(statutory_deadline);
          return d !== null && d <= 2;
        }
        return true;
      }
    }
    return false;
  }
  if (q === "closed") return status === "resolved";
  if (q === "urgent") {
    return isCommUrgent(status, response_deadline) && status !== "draft";
  }
  if (q === "intake") {
    return status === "draft" || status === "served";
  }
  if (q === "working") {
    return (
      status === "acknowledged" ||
      status === "responded" ||
      status === "escalated"
    );
  }
  return true;
}

export function countQueue(
  q: SidebarQueue,
  rows: Array<{
    kind: "comms" | "records";
    status: string;
    response_deadline: string | null;
    statutory_deadline: string | null;
    submitted_at: string | null;
  }>,
): number {
  if (q === "all") {
    return rows.length;
  }
  return rows.filter((r) =>
    matchesSidebarQueue(
      q,
      r.kind,
      r.status,
      r.response_deadline,
      r.statutory_deadline,
      r.submitted_at,
    ),
  ).length;
}
