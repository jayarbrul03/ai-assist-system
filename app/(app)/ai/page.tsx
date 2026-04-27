import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveScheme } from "@/lib/scheme";
import { PageShell, PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { config, isMissing } from "@/lib/config";
import { isLeadershipRole } from "@/lib/roles";
import { Bot, Inbox, MessageSquareText, PenLine, FileSearch } from "lucide-react";

const lim = config.limits;

export default async function ParityAIPage() {
  const ctx = await getActiveScheme();
  if (!ctx) redirect("/login");
  if (!ctx.scheme) redirect("/onboarding");

  const role = ctx.membership?.role ?? "owner";
  const leadership = isLeadershipRole(role);
  const apiKeyMissing = isMissing(config.anthropic.apiKey);

  return (
    <PageShell>
      <PageHeader
        title="Parity AI"
        description="Conversational help, drafting, and triage on demand. Nothing runs in the background: you start each action."
        disclaimer={false}
      />

      {apiKeyMissing ? (
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
          <strong>Model API key missing.</strong> Set{" "}
          <code className="rounded bg-white/80 px-1">ANTHROPIC_API_KEY</code> for real AI. Until then,
          some features may be unavailable or use fallbacks.
        </p>
      ) : null}

      <div className="mb-8 rounded-xl border border-neutral-200 bg-white p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-teal-100 p-2 text-teal-800">
            <Bot className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-neutral-900">Not a standing &ldquo;agent&rdquo;</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">
              Parity does <strong>not</strong> watch your scheme, file documents, or message people on its
              own. AI only runs in the tool you open—The Brain, inbox help, a draft, or a one-off
              analysis—<strong>when you ask</strong> (subject to daily limits and your permissions).
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-teal-800">
              <MessageSquareText className="h-4 w-4" aria-hidden />
              <CardTitle className="text-base">The Brain</CardTitle>
            </div>
            <CardDescription>
              By-law Q&amp;A in plain English with scheme citations (when your library is loaded).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <Button asChild>
              <Link href="/chat">Open The Brain</Link>
            </Button>
            <span className="text-xs text-neutral-500">
              Up to {lim.chatMessagesPerDay} user messages / day
            </span>
          </CardContent>
        </Card>

        {leadership ? (
          <Card className="border-teal-100 sm:col-span-1">
            <CardHeader>
              <div className="flex items-center gap-2 text-teal-800">
                <Inbox className="h-4 w-4" aria-hidden />
                <CardTitle className="text-base">Inbox AI</CardTitle>
              </div>
              <CardDescription>
                Short summaries and triage labels for inbound communications; copy-only draft reply to
                paste into your own email client.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              <Button asChild>
                <Link href="/inbox">Open Inbox</Link>
              </Button>
              <span className="text-xs text-neutral-500">
                {lim.inboxAiBatchesPerDay} batch runs / day · {lim.inboxDraftRepliesPerDay} drafts / day
              </span>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-teal-800">
              <PenLine className="h-4 w-4" aria-hidden />
              <CardTitle className="text-base">Communications &amp; moderation</CardTitle>
            </div>
            <CardDescription>
              Stage-appropriate letter drafts when you start a new communication, plus moderation
              before serve when configured.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/communications/new">New communication</Link>
            </Button>
            <span className="text-xs text-neutral-500">Up to {lim.draftGenerationsPerDay} draft generations / day</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-teal-800">
              <FileSearch className="h-4 w-4" aria-hidden />
              <CardTitle className="text-base">Evidence</CardTitle>
            </div>
            <CardDescription>
              Structured review when you run analysis on an evidence item—triggered from the evidence
              vault, not automatic monitoring.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/evidence">Open evidence</Link>
            </Button>
            <p className="mt-2 text-xs text-neutral-500">
              Up to {lim.evidenceAnalysesPerDay} analyses / day
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 rounded-lg border border-neutral-200 bg-neutral-50/80 p-4 sm:p-5 text-sm text-neutral-700">
        <p className="font-medium text-neutral-900">Daily limits (per user, where rate limits apply)</p>
        <ul className="mt-2 list-inside list-disc space-y-0.5">
          <li>Chat: {lim.chatMessagesPerDay} user messages / day</li>
          {leadership ? (
            <li>
              Inbox: {lim.inboxAiBatchesPerDay} AI batch runs, {lim.inboxDraftRepliesPerDay} draft
              replies / day
            </li>
          ) : null}
          <li>Communication draft helper: {lim.draftGenerationsPerDay} / day</li>
          <li>Evidence analysis: {lim.evidenceAnalysesPerDay} / day</li>
        </ul>
        <p className="mt-3 text-xs text-neutral-500">
          Limits are enforced server-side. Parity does not auto-trigger these actions or train on your
          data outside product operation.
        </p>
      </div>

      <p className="mt-6 text-sm text-neutral-500">
        For the mixed timeline (announcements, messages, records—not AI):{" "}
        <Link className="text-teal-800 underline" href="/feed">
          Open feed
        </Link>{" "}
        ·{" "}
        <Link className="text-teal-800 underline" href="/dashboard">
          Dashboard
        </Link>
      </p>
    </PageShell>
  );
}
