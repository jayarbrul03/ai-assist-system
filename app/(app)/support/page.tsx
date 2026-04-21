import Link from "next/link";
import { PageShell, PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LegalLodgementWarning } from "@/components/ui/legal-warning";
import {
  BookOpen,
  Mail,
  MessageCircleQuestion,
  Shield,
  Gavel,
  Scale,
  HeartHandshake,
} from "lucide-react";

export default function SupportPage() {
  return (
    <PageShell>
      <PageHeader
        title="Support & help"
        description="Answers to common questions, how each feature works, and how to get in touch."
      />

      <div className="grid gap-4 mb-6">
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-teal-50 text-teal-700">
                <MessageCircleQuestion className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Getting started</CardTitle>
                <CardDescription className="mt-1">
                  Three things to do first
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm text-neutral-700 list-decimal list-inside">
              <li>
                Ask a question on the{" "}
                <Link href="/dashboard" className="text-teal-700 underline">
                  dashboard
                </Link>{" "}
                — Rulebook AI answers plainly, with by-law citations.
              </li>
              <li>
                Upload your registered by-laws in{" "}
                <Link href="/settings#bylaws" className="text-teal-700 underline">
                  Settings → By-laws library
                </Link>{" "}
                to get scheme-specific answers.
              </li>
              <li>
                Set your privacy default in{" "}
                <Link href="/settings#privacy" className="text-teal-700 underline">
                  Settings → My data &amp; privacy
                </Link>
                .
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-teal-50 text-teal-700">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">How each feature works</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <FAQ
              q="What does Rulebook AI do?"
              a="It answers plain-English questions about your scheme's registered by-laws and the BCCM Act 1997 (Qld). Every answer ends with the same disclaimer and cites by-law numbers + page numbers. The answer is identical regardless of who asks."
            />
            <FAQ
              q="What's the difference between Communications and Announcements?"
              a="Announcements are bulk messages from committee or manager to everyone in the scheme (on the dashboard). Communications are one-to-one or one-to-committee messages that follow the Stage 1 → Stage 4 ladder. Both are logged forever."
            />
            <FAQ
              q="What are the four communication stages?"
              a="Stage 1: Friendly FYI. Stage 2: Formal Notice. Stage 3: BCCM Contravention Notice (Form 10). Stage 4: Enforcement / dispute intent. Parity won't let you skip stages without a written reason."
            />
            <FAQ
              q="How does Evidence Vault work?"
              a="Upload a screenshot, paste an email, or type a note. Parity's AI structures it (date, source, rule cited, neutral description). Private by default — nobody in your scheme sees it unless you tick 'share'. Your case file, your record."
            />
            <FAQ
              q="When should I file a Records Request?"
              a="When you need minutes, correspondence, towing records, or committee decisions. Parity drafts a BCCM-compliant request and tracks the 7-day statutory deadline."
            />
            <FAQ
              q="What is an Investigation?"
              a="A structured data release. Only committee or manager can open one. Scheme-public data is available immediately. Your private data only moves with your consent, per request. Impact Log + private chats never move, regardless of consent."
            />
            <FAQ
              q="Can my committee see my private evidence?"
              a="No. Not unless you explicitly tick 'share with scheme' on an item, or unless you release it during a specific investigation request. You are always in control."
            />
            <FAQ
              q="Can I delete my account?"
              a="Yes. Contact support below to request full account + data deletion. All rows are cascade-deleted. Audit log entries you authored are retained with your user reference nulled."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-teal-50 text-teal-700">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Your privacy</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-neutral-700">
            <p>
              <strong>Australian data residency:</strong> your data lives in
              Supabase&apos;s Sydney region (ap-southeast-2). Nothing is stored
              outside Australia.
            </p>
            <p>
              <strong>Default private:</strong> evidence, impact logs, chat
              sessions, private drafts — all uploader-owned and invisible to
              the rest of the scheme.
            </p>
            <p>
              <strong>Permanent shields:</strong> Impact Log and Rulebook AI
              conversations are never released under any investigation, even if
              you consent. Coercion shield.
            </p>
            <p>
              <strong>Audit log:</strong> every mutation is logged — creation,
              edit, export, serve. You can export your audit log at any time.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-teal-50 text-teal-700">
                <Gavel className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">When to get a lawyer</CardTitle>
                <CardDescription className="mt-1">
                  Parity is information, not legal advice
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-neutral-700 mb-3">
              Parity is built to help you understand, communicate, and keep a
              clean record. It is <strong>not</strong> a substitute for legal
              advice. Talk to a qualified Australian strata lawyer before:
            </p>
            <ul className="text-sm text-neutral-700 space-y-1 list-disc list-inside">
              <li>Lodging with the BCCM Commissioner</li>
              <li>Filing with an adjudicator or QCAT</li>
              <li>Signing anything that waives rights</li>
              <li>Initiating or responding to defamation claims</li>
              <li>Any written admission of liability</li>
            </ul>
            <LegalLodgementWarning className="mt-4" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-teal-50 text-teal-700">
                <HeartHandshake className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Feel-better resources</CardTitle>
                <CardDescription className="mt-1">
                  Strata disputes are stressful. You matter.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-neutral-700">
            <p>
              <strong>Lifeline (AU):</strong> 13 11 14 — 24/7 crisis support
            </p>
            <p>
              <strong>Beyond Blue (AU):</strong> 1300 22 4636 — mental health
            </p>
            <p>
              <strong>Tenants&apos; Union QLD:</strong>{" "}
              <a
                className="text-teal-700 underline"
                href="https://tenantsqld.org.au"
                target="_blank"
                rel="noopener noreferrer"
              >
                tenantsqld.org.au
              </a>
            </p>
            <p>
              <strong>Legal Aid QLD:</strong>{" "}
              <a
                className="text-teal-700 underline"
                href="https://www.legalaid.qld.gov.au"
                target="_blank"
                rel="noopener noreferrer"
              >
                legalaid.qld.gov.au
              </a>
            </p>
            <p>
              <strong>BCCM Commissioner&apos;s office:</strong> 1800 060 119
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-teal-50 text-teal-700">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">Contact us</CardTitle>
                <CardDescription className="mt-1">
                  Product feedback, bug reports, legal questions about the app
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-neutral-700">
            <p>
              <strong>General support:</strong>{" "}
              <a
                href="mailto:support@parity.app"
                className="text-teal-700 underline"
              >
                support@parity.app
              </a>
            </p>
            <p>
              <strong>Privacy / data requests:</strong>{" "}
              <a
                href="mailto:privacy@parity.app"
                className="text-teal-700 underline"
              >
                privacy@parity.app
              </a>
            </p>
            <p>
              <strong>Security reports:</strong>{" "}
              <a
                href="mailto:security@parity.app"
                className="text-teal-700 underline"
              >
                security@parity.app
              </a>
            </p>
            <div className="pt-2 flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/privacy">Privacy policy</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/terms">Terms of use</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-lg border border-neutral-200 bg-white">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium flex items-center justify-between">
        {q}
        <Scale className="h-3.5 w-3.5 text-neutral-400 group-open:rotate-90 transition" />
      </summary>
      <div className="px-4 pb-4 text-sm text-neutral-700 leading-relaxed">
        {a}
      </div>
    </details>
  );
}
