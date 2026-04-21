import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DisclaimerStrip } from "@/components/ui/disclaimer";
import { Shield, FolderLock, MessagesSquare, FileText } from "lucide-react";

export default function Landing() {
  return (
    <main className="flex flex-1 flex-col">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-neutral-200/70 backdrop-blur bg-neutral-50/80">
        <Link
          href="/"
          className="font-serif-brand text-2xl tracking-tight text-neutral-900"
        >
          Parity
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Get started</Link>
          </Button>
        </div>
      </nav>

      <section className="flex-1 flex flex-col items-center px-6 pt-20 pb-16 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800">
          <Shield className="h-3 w-3" /> Queensland BCCM · neutral by design
        </span>

        <h1 className="font-serif-brand mt-6 text-5xl sm:text-6xl max-w-4xl leading-[1.05] text-neutral-900">
          A fairer space between
          <br />
          <span className="font-editorial text-teal-800">body corporate</span>{" "}
          &amp; lot owners.
        </h1>

        <p className="mt-6 max-w-xl text-lg text-neutral-600 leading-relaxed">
          Parity helps you understand your by-laws, keep a lawyer-ready record,
          and communicate with fairness — from Stage 1 &ldquo;FYI&rdquo; through
          to formal dispute. Same answer, whoever is asking.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-3">
          <Button asChild size="lg">
            <Link href="/signup">Start free — no scheme details needed</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/about">See how it works</Link>
          </Button>
        </div>

        <p className="mt-4 text-xs text-neutral-500">
          Private by default · Australian data residency · Not legal advice
        </p>

        <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl w-full text-left">
          <Feature
            icon={<MessagesSquare className="h-5 w-5" />}
            title="Rulebook AI"
            body="Plain-English answers over your scheme's registered by-laws. Neutral. Same answer to every member."
          />
          <Feature
            icon={<FolderLock className="h-5 w-5" />}
            title="Evidence Vault"
            body="Screenshots, emails, photos — AI structures them into a private, lawyer-ready case file."
          />
          <Feature
            icon={<Shield className="h-5 w-5" />}
            title="Graduated Comms"
            body="Stage 1 Friendly FYI → Stage 4 Enforcement. Procedural fairness built in."
          />
          <Feature
            icon={<FileText className="h-5 w-5" />}
            title="Records Requests"
            body="One-click BCCM-compliant request with a 7-day statutory deadline tracker."
          />
        </div>

        <DisclaimerStrip className="mt-16 max-w-2xl" />
      </section>

      <footer className="border-t border-neutral-200/70 px-8 py-6 text-xs text-neutral-500 flex items-center justify-between">
        <span>© StrataBalance Pty Ltd — Queensland, Australia</span>
        <div className="flex gap-4">
          <Link href="/privacy" className="hover:text-neutral-700">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-neutral-700">
            Terms
          </Link>
        </div>
      </footer>
    </main>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="group rounded-xl border border-neutral-200 bg-white p-5 hover:border-teal-300 hover:shadow-sm transition">
      <div className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-teal-50 text-teal-700 mb-3">
        {icon}
      </div>
      <h3 className="font-serif-brand text-base text-neutral-900 mb-1.5">
        {title}
      </h3>
      <p className="text-sm text-neutral-600 leading-relaxed">{body}</p>
    </div>
  );
}
