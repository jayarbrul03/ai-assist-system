"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Rss,
  MessageSquareText,
  Sparkles,
  FolderLock,
  Clock,
  Send,
  FileText,
  Activity,
  Flag,
  Download,
  Settings,
  Megaphone,
  Gavel,
  LifeBuoy,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";

const baseItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  // { href: "/feed", label: "Feed", icon: Rss },
  { href: "/chat", label: "The Brain", icon: MessageSquareText },
  // { href: "/ai", label: "Parity AI", icon: Sparkles },
  { href: "/announcements", label: "Announcements", icon: Megaphone },
  { href: "/communications", label: "Communications", icon: Send },
  { href: "/records", label: "Records", icon: FileText },
  { href: "/evidence", label: "Evidence", icon: FolderLock },
  { href: "/timeline", label: "Timeline", icon: Clock },
  { href: "/impact", label: "Impact Log", icon: Activity },
  { href: "/issues", label: "Issues", icon: Flag },
  { href: "/investigations", label: "Investigations", icon: Gavel },
  { href: "/export", label: "Export", icon: Download },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/support", label: "Support", icon: LifeBuoy },
];

const inboxItem = { href: "/inbox", label: "Inbox", icon: Inbox };

export function Sidebar({ showInbox = false }: { showInbox?: boolean }) {
  const pathname = usePathname();
  const items = showInbox
    ? [
        baseItems[0],
        inboxItem,
        ...baseItems.slice(1),
      ]
    : [...baseItems];

  return (
    <aside className="w-60 shrink-0 border-r border-neutral-200 bg-white flex flex-col">
      <div className="px-6 py-5 border-b border-neutral-200">
        <Link href="/dashboard" className="font-serif-brand text-xl font-semibold tracking-tight">
          Parity
        </Link>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((it) => {
          const active = pathname === it.href || pathname.startsWith(it.href + "/");
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-teal-50 text-teal-800"
                  : "text-neutral-700 hover:bg-neutral-50",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {it.label}
            </Link>
          );
        })}
      </nav>
      <form action="/api/auth/signout" method="post" className="p-3 border-t border-neutral-200">
        <button
          type="submit"
          className="w-full text-left px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-50"
        >
          Sign out
        </button>
      </form>
    </aside>
  );
}
