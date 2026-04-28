import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveScheme } from "@/lib/scheme";
import { PageShell, PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isCommitteeRole } from "@/lib/roles";
import { BookOpen, Download, Inbox, Megaphone, Rss, Send, Sparkles } from "lucide-react";

export default async function CommitteeDeskPage() {
  const ctx = await getActiveScheme();
  if (!ctx) redirect("/login");
  if (!ctx.scheme) redirect("/onboarding");
  if (!isCommitteeRole(ctx.membership?.role)) {
    redirect("/dashboard");
  }

  return (
    <PageShell>
      <PageHeader
        title="Committee desk"
        description="Official communication, transparency, and record for the body corporate. For levies, budgets, and exact spend lines, your scheme’s lawful accounts process still applies—use announcements and minutes to show owners what was decided."
        disclaimer={true}
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/inbox">Inbox</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/feed">Feed</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 max-w-4xl md:grid-cols-2">
        <Card className="border-teal-100">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Send className="h-4 w-4" /> Notices &amp; stages
            </CardTitle>
            <CardDescription>
              Graduated communication — FYI through formal notice — with audit on serve where used.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href="/communications/new?stage=stage_1_fyi">Stage 1 — FYI</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/communications/new?stage=stage_2_formal_notice">Stage 2 — Formal</Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link href="/communications">All communications</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="border-teal-100">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Megaphone className="h-4 w-4" /> Projects &amp; news
            </CardTitle>
            <CardDescription>
              Publish what owners should know — maintenance, projects, and meetings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/announcements">Announcements</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Rss className="h-4 w-4" /> Transparency
            </CardTitle>
            <CardDescription>
              Feed merges announcements, visible mail, and records in one list for the scheme.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/feed">Open feed</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Inbox className="h-4 w-4" /> Inbound
            </CardTitle>
            <CardDescription>Mail to committee and manager, with the leadership inbox when volume is high.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/inbox">Inbox</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Check by-law language
            </CardTitle>
            <CardDescription>Before you commit the committee to wording, verify against the registered by-laws in-app.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary" size="sm">
              <Link href="/chat">The Brain</Link>
            </Button>
            <span className="ml-2 text-sm text-neutral-500">
              General information, not legal advice.
            </span>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Library &amp; record
            </CardTitle>
            <CardDescription>By-laws in Settings; export a formal record when a dispute is possible.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/settings#bylaws">By-laws library</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/export">
                <Download className="h-4 w-4 mr-1" />
                Export
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
