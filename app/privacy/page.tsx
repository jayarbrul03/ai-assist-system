import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="flex-1 flex flex-col">
      <nav className="px-8 py-6 border-b border-neutral-200">
        <Link href="/" className="font-serif-brand text-xl font-semibold">
          Parity
        </Link>
      </nav>
      <article className="prose prose-neutral max-w-3xl mx-auto px-6 py-12">
        <h1 className="font-serif-brand text-3xl font-semibold">Privacy policy</h1>
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
          Template only. Subject to review by a qualified Australian privacy
          lawyer before public launch.
        </p>
        <h2>Data residency</h2>
        <p>
          All Parity data is stored in Australia (AWS ap-southeast-2 Sydney region)
          on Supabase-managed infrastructure. We do not transfer user data outside
          Australia.
        </p>
        <h2>What we collect</h2>
        <ul>
          <li>Account details: name, email, password hash.</li>
          <li>Scheme details you enter (CMS/CTS number, address).</li>
          <li>Documents you upload (by-laws, evidence).</li>
          <li>Your chat sessions with Rulebook AI.</li>
          <li>Audit log of in-app actions for lawyer-ready provenance.</li>
        </ul>
        <h2>Third-party processors</h2>
        <ul>
          <li>Supabase (Sydney) — database, auth, storage.</li>
          <li>Anthropic — AI inference (evidence analysis, chat drafting).</li>
          <li>Voyage AI — text embeddings for by-law search.</li>
          <li>Resend — email delivery for notifications.</li>
        </ul>
        <h2>Your rights</h2>
        <p>
          You can export your data as JSON at any time via Settings → Data Export,
          or delete your account to erase all associated records.
        </p>
        <h2>Contact</h2>
        <p>privacy@parity.app</p>
      </article>
    </main>
  );
}
