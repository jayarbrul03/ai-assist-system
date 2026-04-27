import Link from "next/link";
import { FileText, Megaphone, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime, cn } from "@/lib/utils";
import { stageLabel } from "@/lib/comms";
import type { FeedItem } from "@/lib/feed/types";

const MAX_EXCERPT = 220;

function excerpt(body: string): string {
  const t = body.trim();
  if (t.length <= MAX_EXCERPT) return t;
  return `${t.slice(0, MAX_EXCERPT)}…`;
}

function commsKindLabel(
  isOutbound: boolean,
  toParty: string | null,
): { title: string; sub: string } {
  if (isOutbound) {
    const to =
      toParty === "committee"
        ? "committee"
        : toParty === "manager"
          ? "the manager"
          : toParty || "the body corporate";
    return { title: "Your message", sub: `To ${to}` };
  }
  if (toParty === "manager") {
    return { title: "Inbound to manager", sub: "From a lot owner / tenant" };
  }
  if (toParty === "committee") {
    return { title: "Inbound to committee", sub: "From a lot owner / tenant" };
  }
  return { title: "Message", sub: toParty ? `To ${toParty}` : "Communication" };
}

const toneToBadge = (
  tone: string,
): { variant: "success" | "secondary" | "warning" | "default" | "danger"; label: string } => {
  const t = (tone || "info").toLowerCase();
  if (t === "urgent") return { variant: "danger", label: "Urgent" };
  if (t === "negative") return { variant: "default", label: "Notice" };
  if (t === "positive") return { variant: "success", label: "Positive" };
  if (t === "reminder" || t === "meeting") {
    return { variant: "warning", label: t === "reminder" ? "Reminder" : "Meeting" };
  }
  if (t === "info") return { variant: "secondary", label: "Info" };
  return { variant: "secondary", label: t.charAt(0).toUpperCase() + t.slice(1) };
};

export function FeedTimeline({ items }: { items: FeedItem[] }) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-neutral-500">
          Nothing in your feed yet. When announcements are published or you have communications and
          records activity, it will show here—newest first.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-0 rounded-xl border border-neutral-200 bg-white shadow-sm">
      {items.map((it) => (
        <div
          key={it.kind + it.id}
          className={cn(
            "border-b border-neutral-100 px-3 py-4 sm:px-4 last:border-b-0",
            "hover:bg-neutral-50/80",
          )}
        >
          {it.kind === "announcement" ? (
            <div className="flex flex-col gap-2 min-[400px]:flex-row min-[400px]:items-start min-[400px]:justify-between min-[400px]:gap-4">
              <div className="flex min-w-0 flex-1 gap-2">
                <div className="mt-0.5 shrink-0 text-teal-600">
                  <Megaphone className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-neutral-500">
                    {formatDateTime(it.at)}
                    {it.pinned ? (
                      <span className="ml-2 font-medium text-teal-800">· Pinned</span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 font-medium text-neutral-900 [overflow-wrap:anywhere]">
                    {it.title}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-neutral-600 [overflow-wrap:anywhere]">
                    {excerpt(it.body)}
                  </p>
                </div>
              </div>
              <div className="pl-7 min-[400px]:pl-0 min-[400px]:pt-0.5">
                <Badge variant={toneToBadge(it.tone).variant}>{toneToBadge(it.tone).label}</Badge>
              </div>
            </div>
          ) : it.kind === "comms" ? (
            (() => {
              const { title, sub } = commsKindLabel(it.isOutbound, it.to_party);
              return (
                <div className="flex flex-col gap-2 min-[400px]:flex-row min-[400px]:items-start min-[400px]:justify-between min-[400px]:gap-3">
                  <div className="flex min-w-0 flex-1 gap-2">
                    <div className="mt-0.5 shrink-0 text-teal-600">
                      <Send className="h-4 w-4" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-neutral-500">
                        {formatDateTime(it.at)} · {sub}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-teal-800 uppercase tracking-wide">
                        {title}
                      </p>
                      <p className="mt-0.5 font-medium text-neutral-900 [overflow-wrap:anywhere]">
                        {it.subject || "(no subject)"}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px]">
                          {it.status}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {stageLabel(it.stage)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="pl-6 min-[400px]:pl-0 min-[400px]:pt-0.5">
                    <Button asChild size="sm" variant="outline" className="min-h-9 w-full min-[400px]:w-auto">
                      <Link href={`/communications/${it.id}`}>Open</Link>
                    </Button>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="flex flex-col gap-2 min-[400px]:flex-row min-[400px]:items-start min-[400px]:justify-between min-[400px]:gap-3">
              <div className="flex min-w-0 flex-1 gap-2">
                <div className="mt-0.5 shrink-0 text-teal-600">
                  <FileText className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-neutral-500">{formatDateTime(it.at)}</p>
                  <p className="mt-0.5 text-xs font-medium text-teal-800 uppercase tracking-wide">
                    Records request
                  </p>
                  <p className="mt-0.5 text-sm text-neutral-700 [overflow-wrap:anywhere]">
                    {it.request_type?.length ? it.request_type.join(", ") : "—"}
                  </p>
                  <Badge variant="secondary" className="mt-1.5 text-[10px]">
                    {it.status}
                  </Badge>
                </div>
              </div>
              <div className="pl-6 min-[400px]:pl-0 min-[400px]:pt-0.5">
                <Button asChild size="sm" variant="outline" className="min-h-9 w-full min-[400px]:w-auto">
                  <Link href={`/records/${it.id}`}>Open</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function FeedIntroCard({ isLeadership }: { isLeadership: boolean }) {
  if (!isLeadership) return null;
  return (
    <Card className="border-teal-200 bg-teal-50/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Committee &amp; manager</CardTitle>
        <CardDescription>
          This feed is a single timeline of announcements, communications you can see, and
          records activity. For <strong>queues, labels, and AI</strong> on inbound mail, use the
          Inbox.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Button asChild size="sm" variant="default">
          <Link href="/inbox">Open Inbox</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
