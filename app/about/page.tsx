import Link from "next/link";
import { DisclaimerStrip } from "@/components/ui/disclaimer";

export default function AboutPage() {
  return (
    <main className="flex-1 flex flex-col">
      <nav className="px-8 py-6 border-b border-neutral-200">
        <Link href="/" className="font-serif-brand text-xl font-semibold">
          Parity
        </Link>
      </nav>
      <article className="max-w-3xl mx-auto px-6 py-16 space-y-6">
        <h1 className="font-serif-brand text-4xl font-semibold">How it works</h1>
        <p className="text-lg text-neutral-700 leading-relaxed">
          Parity sits between body corporate committees and lot owners as a
          neutral information and accountability layer. We ingest your scheme&apos;s
          registered by-laws, cross-reference the BCCM Act 1997 (Qld), and answer
          the same question the same way regardless of who&apos;s asking.
        </p>
        <ol className="space-y-4 text-neutral-700">
          <li><strong>Rulebook AI</strong> — Plain-English answers with by-law citations.</li>
          <li><strong>Evidence Vault</strong> — Private, lawyer-ready case file.</li>
          <li><strong>Graduated Communications</strong> — Stage 1 FYI → Stage 4 Enforcement.</li>
          <li><strong>Records Request Portal</strong> — BCCM-compliant, with 7-day deadline tracking.</li>
        </ol>
        <DisclaimerStrip />
      </article>
    </main>
  );
}
