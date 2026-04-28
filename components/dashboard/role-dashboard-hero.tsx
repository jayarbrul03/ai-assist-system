import type { ComponentType } from "react";
import Link from "next/link";
import {
  Building2,
  Camera,
  ClipboardList,
  Gavel,
  Inbox,
  LayoutGrid,
  Megaphone,
  MessageSquareText,
  Rss,
  Send,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type RoleSegment = "resident" | "manager" | "committee";

const cardBase =
  "group flex flex-col gap-1 rounded-xl border border-neutral-200/90 bg-white p-4 text-left shadow-sm transition hover:border-teal-200 hover:shadow-md sm:p-5";

function ActionCard({
  href,
  icon: Icon,
  title,
  description,
  className,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <Link href={href} className={cn(cardBase, className)}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-800">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-neutral-900 text-sm sm:text-base">{title}</p>
          <p className="text-xs sm:text-sm text-neutral-600 mt-0.5 leading-snug">{description}</p>
        </div>
      </div>
    </Link>
  );
}

export function RoleDashboardHero({
  segment,
  schemeName,
  firstName,
}: {
  segment: RoleSegment;
  schemeName: string;
  firstName: string;
}) {
  if (segment === "resident") {
    return (
      <section className="mb-8" aria-labelledby="role-hero-title">
        <div className="rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50/80 via-white to-white p-5 sm:p-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-teal-800">{schemeName}</p>
          <h2
            id="role-hero-title"
            className="font-serif-brand text-2xl sm:text-3xl text-neutral-900 mt-2"
          >
            {firstName ? `Hi ${firstName} — your support path` : "Your support path"}
          </h2>
          <p className="text-neutral-600 mt-2 max-w-2xl text-sm sm:text-base">
            Lodge an enquiry, add photos or files as evidence, and use The Brain to read your{" "}
            <strong>registered by-laws</strong> in plain language. Everything stays{" "}
            <strong>private to you</strong> until you send something to the committee.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/my-case">Start guided: My case</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/feed">Activity feed</Link>
            </Button>
          </div>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            <ActionCard
              href="/my-case"
              icon={ClipboardList}
              title="Guided steps"
              description="Enquiry → evidence → letter to the body corporate — in order."
            />
            <ActionCard
              href="/evidence/new"
              icon={Camera}
              title="Add evidence"
              description="Upload photos, PDFs, or notes for your record."
            />
            <ActionCard
              href="/chat"
              icon={Sparkles}
              title="Understand by-laws"
              description="Ask The Brain; answers use your scheme’s uploaded rules."
            />
            <ActionCard
              href="/communications/new?stage=stage_1_fyi"
              icon={Send}
              title="Write to the committee"
              description="Start a calm Stage 1 message when you are ready."
            />
            <ActionCard
              href="/issues"
              icon={Gavel}
              title="Track an issue"
              description="Log and follow what matters to your lot."
            />
            <ActionCard
              href="/feed"
              icon={Rss}
              title="See what’s going on"
              description="Announcements and your allowed activity in one list."
            />
          </div>
        </div>
      </section>
    );
  }

  if (segment === "manager") {
    return (
      <section className="mb-8" aria-labelledby="manager-hero-title">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50/90 via-white to-white p-5 sm:p-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-600">
            Manager · {schemeName}
          </p>
          <h2 id="manager-hero-title" className="font-serif-brand text-2xl sm:text-3xl text-neutral-900 mt-2">
            Operations &amp; review
          </h2>
          <p className="text-neutral-600 mt-2 max-w-2xl text-sm sm:text-base">
            Review inbound mail, records, and issues across the scheme. Issue notices and updates from
            the right tools — the <strong>inbox</strong> is your high-volume queue; this page is the
            map of everything.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/inbox">Open inbox</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/manager">Manager centre</Link>
            </Button>
          </div>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            <ActionCard
              href="/inbox"
              icon={Inbox}
              title="Inbox &amp; AI triage"
              description="Committee and manager mail, labels, summaries, draft replies."
            />
            <ActionCard
              href="/records"
              icon={LayoutGrid}
              title="All records requests"
              description="Statutory clocks and status across the scheme."
            />
            <ActionCard
              href="/issues"
              icon={ClipboardList}
              title="Issues"
              description="Open and tracked issues for review."
            />
            <ActionCard
              href="/communications"
              icon={Send}
              title="Communications"
              description="All threads and notices you can access."
            />
            <ActionCard
              href="/evidence"
              icon={Camera}
              title="Evidence"
              description="Review material on file for the scheme where policy allows."
            />
            <ActionCard
              href="/announcements"
              icon={Megaphone}
              title="Post an announcement"
              description="Scheme-wide updates in-app."
            />
          </div>
        </div>
      </section>
    );
  }

  // committee
  return (
    <section className="mb-8" aria-labelledby="bc-hero-title">
      <div className="rounded-2xl border border-teal-200/80 bg-gradient-to-br from-teal-50/50 via-white to-amber-50/20 p-5 sm:p-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-teal-800">
          Body corporate / committee · {schemeName}
        </p>
        <h2 id="bc-hero-title" className="font-serif-brand text-2xl sm:text-3xl text-neutral-900 mt-2">
          Control, communication &amp; transparency
        </h2>
        <p className="text-neutral-600 mt-2 max-w-2xl text-sm sm:text-base">
          Send <strong>official communications</strong>, post <strong>announcements</strong>, and
          keep the scheme informed. For <strong>spending and major projects</strong>, document
          decisions in Parity and link supporting material — detailed levies/accounts modules are
          not in v1, but you can <strong>communicate</strong> approved projects and publish updates
          here.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/committee">Committee desk</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/inbox">Inbox</Link>
          </Button>
        </div>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          <ActionCard
            href="/announcements"
            icon={Megaphone}
            title="Announcements"
            description="Project updates, meetings, and scheme-wide news."
          />
          <ActionCard
            href="/communications/new?stage=stage_2_formal_notice"
            icon={Send}
            title="Issue a formal notice"
            description="When a procedural letter is required."
          />
          <ActionCard
            href="/feed"
            icon={Rss}
            title="Activity feed"
            description="What lot owners and managers can see, in one place."
          />
          <ActionCard
            href="/inbox"
            icon={Inbox}
            title="Inbox"
            description="Inbound mail to committee and manager."
          />
          <ActionCard
            href="/export"
            icon={Building2}
            title="Export &amp; record"
            description="PDF case file for major decisions and disputes."
          />
          <ActionCard
            href="/chat"
            icon={MessageSquareText}
            title="The Brain"
            description="Check by-law wording before you commit to language."
          />
        </div>
      </div>
    </section>
  );
}
