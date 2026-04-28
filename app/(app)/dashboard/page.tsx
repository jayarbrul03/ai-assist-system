import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveScheme } from "@/lib/scheme";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DisclaimerStrip } from "@/components/ui/disclaimer";
import { daysUntil, formatDate } from "@/lib/utils";
import {
  Sparkles,
  MessageCircleQuestion,
  Megaphone,
  HeartHandshake,
  PenLine,
  BookOpen,
  FolderLock,
  ChevronDown,
  Shield,
  Users,
} from "lucide-react";
import { QuickAsk } from "./quick-ask";
import { RoleDashboardHero } from "@/components/dashboard/role-dashboard-hero";
import { getRoleSegment } from "@/lib/roles";

export default async function DashboardPage() {
  const ctx = await getActiveScheme();
  if (!ctx) redirect("/login");
  if (!ctx.scheme) redirect("/onboarding");

  const supabase = await createClient();
  const schemeId = ctx.scheme.id;
  const role = ctx.membership?.role ?? "owner";
  const isLeadership =
    role === "committee_chair" ||
    role === "committee_member" ||
    role === "manager";
  const roleSegment = getRoleSegment(role);

  const [
    { count: evidenceCount },
    { count: openIssues },
    { data: pendingComms },
    { data: activeRecords },
    { count: bylawsCount },
    { data: announcements },
  ] = await Promise.all([
    supabase
      .from("evidence_items")
      .select("id", { count: "exact", head: true })
      .eq("scheme_id", schemeId),
    supabase
      .from("legal_issues")
      .select("id", { count: "exact", head: true })
      .eq("scheme_id", schemeId)
      .eq("status", "open"),
    supabase
      .from("communications")
      .select("*")
      .eq("scheme_id", schemeId)
      .in("status", ["draft", "served", "acknowledged"])
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("records_requests")
      .select("*")
      .eq("scheme_id", schemeId)
      .in("status", ["submitted", "acknowledged"])
      .order("statutory_deadline", { ascending: true })
      .limit(3),
    supabase
      .from("bylaws_chunks")
      .select("id", { count: "exact", head: true })
      .eq("scheme_id", schemeId),
    supabase
      .from("scheme_announcements")
      .select("id, title, body, tone, pinned, published_at")
      .eq("scheme_id", schemeId)
      .order("pinned", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(3),
  ]);

  const liveAnnouncements = (announcements ?? []) as Array<{
    id: string;
    title: string;
    body: string;
    tone: string;
    pinned: boolean;
    published_at: string;
  }>;

  const bylawsLoaded = (bylawsCount ?? 0) > 0;
  const firstName =
    ctx.user.email?.split("@")[0]?.replace(/[._-]/g, " ") ?? "there";

  return (
    <div className="px-6 sm:px-10 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-teal-700 font-medium">
          {ctx.scheme.name}
        </p>
        <h1 className="font-serif-brand text-3xl sm:text-4xl text-neutral-900 mt-2">
          Good to see you{firstName ? `, ${capitalize(firstName)}` : ""}.
        </h1>
        <p className="text-neutral-600 mt-2 text-base">
          {roleSegment === "resident"
            ? "Start below with your path — or scroll for announcements and the full toolset."
            : roleSegment === "manager"
              ? "Review scheme-wide activity, clear the inbox, and keep record where it matters."
              : "Lead communication, transparency, and a clean record of decisions and notices."}
        </p>
      </header>

      <DisclaimerStrip className="mb-6" compact />

      <RoleDashboardHero
        segment={roleSegment}
        schemeName={ctx.scheme.name}
        firstName={firstName ? capitalize(firstName.trim().split(/\s+/)[0] || firstName) : "there"}
      />

      {/* HERO — The Brain (by-law Q&A) */}
      <Card className="mb-8 border-teal-200 bg-gradient-to-br from-teal-50/70 via-white to-white">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-teal-600 text-white shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">Ask anything about your scheme</CardTitle>
              <CardDescription className="mt-1">
                Plain-English answers about by-laws, procedures, and how
                to handle a situation — with citations.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <QuickAsk schemeId={schemeId} bylawsLoaded={bylawsLoaded} />
        </CardContent>
      </Card>

      {/* 2-col main */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {/* Announcements */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-teal-700" />
              <CardTitle className="text-base">Scheme announcements</CardTitle>
            </div>
            <CardDescription>
              Committee &amp; manager updates for everyone in the scheme
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {liveAnnouncements.length === 0 ? (
              <p className="text-sm text-neutral-500">
                {isLeadership
                  ? "No announcements yet. Post one to keep everyone informed."
                  : "No announcements yet. Your committee or manager hasn't posted anything."}
              </p>
            ) : (
              liveAnnouncements.map((a) => (
                <AnnouncementItem
                  key={a.id}
                  date={formatDate(a.published_at)}
                  title={a.title}
                  body={a.body.slice(0, 240) + (a.body.length > 240 ? "…" : "")}
                  tag={a.tone as "positive" | "info" | "meeting" | "reminder" | "urgent"}
                />
              ))
            )}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/announcements">View all</Link>
              </Button>
              {/* <Button asChild variant="ghost" size="sm">
                <Link href="/feed">Merged feed</Link>
              </Button> */}
              {isLeadership ? (
                <Button asChild variant="outline" size="sm">
                  <Link href="/announcements">
                    <PenLine className="h-4 w-4" /> Post an announcement
                  </Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* Positive recognition */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <HeartHandshake className="h-4 w-4 text-teal-700" />
              <CardTitle className="text-base">
                {isLeadership ? "Good things to recognise" : "What's going well"}
              </CardTitle>
            </div>
            <CardDescription>
              {isLeadership
                ? "Celebrate the work — reinforces the positive tone"
                : "Notice what the committee is doing right"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Positive text="Records request fulfilled in 4 days (target: 7)" />
            <Positive text="Minutes published within 14 days 3 months running" />
            <Positive text="No escalated disputes this quarter" />
            {isLeadership ? (
              <Button asChild variant="ghost" size="sm" className="mt-2">
                <Link href="/communications/new?stage=stage_1_fyi&topic=positive">
                  + Add recognition
                </Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Communication helper + By-laws library */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageCircleQuestion className="h-4 w-4 text-teal-700" />
              <CardTitle className="text-base">Help me write something</CardTitle>
            </div>
            <CardDescription>
              Parity drafts calm, factual language that gets better responses
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(isLeadership
              ? LEADER_COMMS_PROMPTS
              : MEMBER_COMMS_PROMPTS
            ).map((p) => (
              <Button
                key={p.label}
                asChild
                variant="outline"
                className="justify-start h-auto py-3 flex flex-col items-start text-left"
              >
                <Link href={p.href}>
                  <span className="text-sm font-medium">{p.label}</span>
                  <span className="text-xs text-neutral-500 font-normal">
                    {p.hint}
                  </span>
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-teal-700" />
              <CardTitle className="text-base">By-laws library</CardTitle>
            </div>
            <CardDescription>
              {bylawsLoaded
                ? `${bylawsCount} provisions indexed — Rulebook AI answers from these`
                : "Upload your scheme's registered by-laws to unlock citation-grade answers"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {bylawsLoaded ? (
              <div className="flex items-center gap-2 text-sm text-teal-800">
                <Shield className="h-4 w-4" />
                <span>Scheme corpus loaded. Ask anything above.</span>
              </div>
            ) : (
              <p className="text-sm text-neutral-600">
                Without the registered by-laws, Parity still answers from
                general BCCM knowledge — but with fewer specifics. You can
                upload at any time.
              </p>
            )}
            <div className="flex gap-2">
              <Button asChild variant={bylawsLoaded ? "outline" : "default"} size="sm">
                <Link href="/settings#bylaws">
                  {bylawsLoaded ? "Manage library" : "Upload by-laws"}
                </Link>
              </Button>
              {bylawsLoaded ? (
                <Button asChild variant="ghost" size="sm">
                  <Link href="/chat">Open Rulebook AI</Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Universal overlay — why Parity works for everyone */}
      <Card className="mb-8 bg-neutral-50 border-neutral-200">
        <CardContent className="py-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-teal-700" />
            <p className="text-sm font-medium text-neutral-700">
              How Parity helps everyone in your scheme
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <OverlayPillar
              role="Lot owners"
              pitch="Understand by-laws. Communicate calmly. Record what matters, only when needed."
            />
            <OverlayPillar
              role="Tenants"
              pitch="Know your standing. Raise concerns through your landlord. Keep your own record."
            />
            <OverlayPillar
              role="Committee"
              pitch="Communicate with fairness. Get recognised for what works. Protect the process."
            />
            <OverlayPillar
              role="Managers"
              pitch="Respond to records requests on time. Keep a clean audit trail across schemes."
            />
          </div>
        </CardContent>
      </Card>

      {/* Case file — COLLAPSED, for when needed */}
      <details className="rounded-xl border border-neutral-200 bg-white">
        <summary className="cursor-pointer list-none flex items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-3">
            <FolderLock className="h-4 w-4 text-neutral-500" />
            <div>
              <p className="text-sm font-medium text-neutral-900">
                Your case file {evidenceCount || openIssues ? "(active)" : "(empty — that's good)"}
              </p>
              <p className="text-xs text-neutral-500">
                Evidence, issues, deadlines — available if a dispute escalates.
                Private to you.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary">{evidenceCount ?? 0} evidence</Badge>
            <Badge variant="secondary">{openIssues ?? 0} issues</Badge>
            <ChevronDown className="h-4 w-4 text-neutral-400" />
          </div>
        </summary>
        <div className="px-5 pb-5 pt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
          <MiniStat label="Evidence" value={evidenceCount ?? 0} href="/evidence" cta="Open vault" />
          <MiniStat label="Open issues" value={openIssues ?? 0} href="/issues" cta="Review" />
          <Card>
            <CardHeader className="py-3">
              <CardDescription className="text-xs">Pending comms</CardDescription>
              <CardTitle className="text-2xl">{pendingComms?.length ?? 0}</CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <ul className="space-y-1.5 text-xs text-neutral-600">
                {(pendingComms ?? []).slice(0, 2).map((c) => (
                  <li key={c.id} className="truncate">
                    · {c.subject || "(no subject)"}
                  </li>
                ))}
                {(pendingComms ?? []).length === 0 ? (
                  <li className="text-neutral-400">None — all caught up.</li>
                ) : null}
              </ul>
            </CardContent>
          </Card>
          {activeRecords && activeRecords.length > 0 ? (
            <Card className="md:col-span-3">
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Records requests — 7-day clock</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <ul className="space-y-1.5">
                  {activeRecords.map((r) => {
                    const d = daysUntil(r.statutory_deadline);
                    const overdue = d !== null && d < 0;
                    return (
                      <li
                        key={r.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>
                          {(r.request_type || []).join(", ") || "Records request"}
                        </span>
                        <Badge
                          variant={
                            overdue
                              ? "danger"
                              : d !== null && d <= 2
                              ? "warning"
                              : "secondary"
                          }
                        >
                          {d === null
                            ? "—"
                            : overdue
                            ? `${Math.abs(d)}d overdue`
                            : `${d}d left`}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ) : null}
          <div className="md:col-span-3 flex flex-wrap gap-2 pt-2 border-t border-neutral-100">
            <Button asChild variant="outline" size="sm">
              <Link href="/evidence/new">+ Add evidence</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/impact">Impact log</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/timeline">Timeline</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/export">Export case file PDF</Link>
            </Button>
          </div>
        </div>
      </details>
    </div>
  );
}

const MEMBER_COMMS_PROMPTS = [
  {
    label: "Raise a concern (FYI)",
    hint: "Calm, collaborative — Stage 1",
    href: "/communications/new?stage=stage_1_fyi",
  },
  {
    label: "Formal notice to committee",
    hint: "Professional — Stage 2",
    href: "/communications/new?stage=stage_2_formal_notice",
  },
  {
    label: "Thank or acknowledge",
    hint: "Reinforce the positive",
    href: "/communications/new?stage=stage_1_fyi&topic=thank",
  },
  {
    label: "Records request",
    hint: "BCCM-compliant · 7-day clock",
    href: "/records/new",
  },
] as const;

const LEADER_COMMS_PROMPTS = [
  {
    label: "Scheme announcement",
    hint: "To all lot owners & tenants",
    href: "/communications/new?stage=announcement",
  },
  {
    label: "Non-forceful compliance ask",
    hint: "Gets compliance without resistance",
    href: "/communications/new?stage=stage_1_fyi",
  },
  {
    label: "Acknowledge a lot owner",
    hint: "Positive reinforcement",
    href: "/communications/new?stage=stage_1_fyi&topic=thank",
  },
  {
    label: "Formal notice (Stage 2)",
    hint: "Only if FYI goes unanswered",
    href: "/communications/new?stage=stage_2_formal_notice",
  },
] as const;

function AnnouncementItem({
  date,
  title,
  body,
  tag,
}: {
  date: string;
  title: string;
  body: string;
  tag: "positive" | "info" | "meeting" | "reminder" | "urgent";
}) {
  const variant =
    tag === "positive"
      ? "success"
      : tag === "urgent"
      ? "danger"
      : tag === "reminder"
      ? "warning"
      : "secondary";
  return (
    <div className="flex items-start gap-3 pb-3 border-b border-neutral-100 last:border-0 last:pb-0">
      <Badge variant={variant as "success" | "danger" | "warning" | "secondary"}>
        {tag.charAt(0).toUpperCase() + tag.slice(1)}
      </Badge>
      <div className="flex-1">
        <p className="text-xs text-neutral-500">{date}</p>
        <p className="text-sm font-medium mt-0.5">{title}</p>
        <p className="text-sm text-neutral-600 mt-0.5">{body}</p>
      </div>
    </div>
  );
}

function Positive({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <HeartHandshake className="h-4 w-4 text-teal-700 mt-0.5 shrink-0" />
      <span className="text-neutral-700">{text}</span>
    </div>
  );
}

function OverlayPillar({ role, pitch }: { role: string; pitch: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-teal-700 font-medium">
        {role}
      </p>
      <p className="text-sm text-neutral-700 mt-1 leading-snug">{pitch}</p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  href,
  cta,
}: {
  label: string;
  value: number;
  href: string;
  cta: string;
}) {
  return (
    <Card>
      <CardHeader className="py-3">
        <CardDescription className="text-xs">{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="py-2">
        <Button asChild variant="ghost" size="sm">
          <Link href={href}>{cta}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
