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
import { isResidentRole } from "@/lib/roles";
import { Camera, CheckCircle2, FileText, MessageCircle, Rss, Send, Sparkles } from "lucide-react";

export default async function MyCasePage() {
  const ctx = await getActiveScheme();
  if (!ctx) redirect("/login");
  if (!ctx.scheme) redirect("/onboarding");

  const role = ctx.membership?.role ?? "owner";
  if (!isResidentRole(role)) {
    redirect("/dashboard");
  }

  const steps = [
    {
      n: 1,
      title: "Understand the rules in your language",
      body: "Ask The Brain about your scheme’s registered by-laws (uploaded in Settings).",
      href: "/chat",
      cta: "Open The Brain",
      icon: Sparkles,
    },
    {
      n: 2,
      title: "Gather evidence",
      body: "Photos, PDFs, emails, or notes so you can show what happened — your vault is private to you until you use it in a process.",
      href: "/evidence/new",
      cta: "Add evidence",
      icon: Camera,
    },
    {
      n: 3,
      title: "Raise an enquiry (optional records)",
      body: "Request access to body corporate records if you need to confirm a rule, resolution, or financial record on file.",
      href: "/records/new",
      cta: "New records request",
      icon: FileText,
    },
    {
      n: 4,
      title: "Write to the body corporate (committee)",
      body: "Start with a Stage 1 FYI: calm, factual, and on the record inside Parity.",
      href: "/communications/new?stage=stage_1_fyi",
      cta: "Start a communication",
      icon: Send,
    },
    {
      n: 5,
      title: "Log or follow an issue",
      body: "If something needs tracking across multiple steps, use the issues list.",
      href: "/issues",
      cta: "Open issues",
      icon: MessageCircle,
    },
    {
      n: 6,
      title: "See scheme-wide updates",
      body: "Announcements, your messages, and allowed activity in one feed — not a substitute for your private evidence vault.",
      href: "/feed",
      cta: "Open feed",
      icon: Rss,
    },
  ] as const;

  return (
    <PageShell>
      <PageHeader
        title="My case"
        description="A guided order for lot owners and tenants. You stay in control of what you send to the body corporate. Nothing here is sent automatically."
        disclaimer={true}
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        }
      />

      <ol className="space-y-4 list-none p-0 m-0 max-w-3xl">
        {steps.map((s) => {
          const Icon = s.icon;
          return (
            <li key={s.n}>
              <Card className="overflow-hidden border-teal-100/80">
                <CardHeader className="bg-teal-50/40 pb-3 sm:flex sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-700 text-sm font-bold text-white">
                      {s.n}
                    </span>
                    <div>
                      <CardTitle className="text-base sm:text-lg">{s.title}</CardTitle>
                      <CardDescription className="mt-1.5 text-sm leading-relaxed">
                        {s.body}
                      </CardDescription>
                    </div>
                  </div>
                  <Button asChild className="w-full min-[480px]:w-auto shrink-0" variant="default">
                    <Link href={s.href}>
                      <Icon className="h-4 w-4 mr-1.5" aria-hidden />
                      {s.cta}
                    </Link>
                  </Button>
                </CardHeader>
              </Card>
            </li>
          );
        })}
      </ol>

      <Card className="mt-8 max-w-3xl border-dashed">
        <CardContent className="pt-5 flex flex-col sm:flex-row sm:items-center gap-3 text-sm text-neutral-700">
          <CheckCircle2 className="h-5 w-5 text-teal-600 shrink-0" aria-hidden />
          <p>
            <strong>Tip:</strong> you can return to any step. Parity is procedural — a good record
            is built over time, not in one go.
          </p>
        </CardContent>
      </Card>
    </PageShell>
  );
}
