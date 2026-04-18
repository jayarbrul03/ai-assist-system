import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DisclaimerStrip } from "@/components/ui/disclaimer";

export default function Landing() {
  return (
    <main className="flex flex-1 flex-col">
      <nav className="flex items-center justify-between px-8 py-6 border-b border-neutral-200">
        <Link href="/" className="font-serif-brand text-2xl font-semibold tracking-tight">
          Parity
        </Link>
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Get started</Link>
          </Button>
        </div>
      </nav>

      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-teal-700 mb-4">
          StrataBalance · Queensland BCCM
        </p>
        <h1 className="font-serif-brand text-5xl sm:text-6xl font-semibold tracking-tight max-w-4xl leading-[1.05]">
          Balance for strata.
          <br />
          Clarity for everyone.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-neutral-600 leading-relaxed">
          A neutral AI governance, communication and accountability layer between body
          corporate committees and lot owners in Queensland strata schemes.
        </p>
        <div className="mt-10 flex gap-3">
          <Button asChild size="lg">
            <Link href="/signup">Start a scheme</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/about">How it works</Link>
          </Button>
        </div>

        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl w-full text-left">
          <Feature
            title="Rulebook AI"
            body="Plain-English answers over your scheme's registered by-laws with BCCM Act cross-reference. Same answer, regardless of who asks."
          />
          <Feature
            title="Evidence Vault"
            body="Private, lawyer-ready case-file builder. Screenshots, emails, photos become structured evidence in seconds."
          />
          <Feature
            title="Graduated Comms"
            body="Stage 1 Friendly FYI → Stage 4 Enforcement. Procedural fairness, enforced by the system."
          />
        </div>

        <DisclaimerStrip className="mt-16 max-w-2xl" />
      </section>

      <footer className="border-t border-neutral-200 px-8 py-6 text-xs text-neutral-500 flex items-center justify-between">
        <span>© StrataBalance Pty Ltd — Queensland, Australia</span>
        <div className="flex gap-4">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>
      </footer>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6">
      <h3 className="font-serif-brand text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-neutral-600 leading-relaxed">{body}</p>
    </div>
  );
}
