import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 min-h-screen flex-col">
      <nav className="flex items-center justify-between px-8 py-6 border-b border-neutral-200">
        <Link
          href="/"
          className="font-serif-brand text-xl font-semibold tracking-tight"
        >
          Parity
        </Link>
      </nav>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
