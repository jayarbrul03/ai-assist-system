"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Rss,
  ListChecks,
  Briefcase,
  Landmark,
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
  { href: "/feed", label: "Feed", icon: Rss },
  { href: "/chat", label: "The Brain", icon: MessageSquareText },
  { href: "/ai", label: "Parity AI", icon: Sparkles },
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
] as const;

/** Main nav for lot owners, tenants, observers: matches “My case” story; advanced tools sit under “More”. */
const RESIDENT_MAIN_ORDER = [
  "/dashboard",
  "/my-case",
  "/feed",
  "/chat",
  "/announcements",
  "/communications",
  "/evidence",
  "/issues",
  "/export",
  "/settings",
  "/support",
] as const;

const RESIDENT_MORE_ORDER = [
  "/ai",
  "/records",
  "/timeline",
  "/impact",
  "/investigations",
] as const;

const inboxItem = { href: "/inbox", label: "Inbox", icon: Inbox };
const myCaseItem = { href: "/my-case", label: "My case", icon: ListChecks };
const managerItem = { href: "/manager", label: "Manager centre", icon: Briefcase };
const committeeItem = { href: "/committee", label: "Committee desk", icon: Landmark };

function itemFromHref(
  href: string,
):
  | { href: string; label: string; icon: LucideIcon }
  | undefined {
  if (href === "/my-case") return myCaseItem;
  return baseItems.find((b) => b.href === href);
}

export function Sidebar({
  showInbox = false,
  showMyCase = false,
  showManagerHub = false,
  showCommitteeHub = false,
  simplifiedResident = false,
}: {
  showInbox?: boolean;
  showMyCase?: boolean;
  showManagerHub?: boolean;
  showCommitteeHub?: boolean;
  /** Lot owner / tenant / observer: shorter primary nav; deep tools under “More tools”. */
  simplifiedResident?: boolean;
}) {
  const pathname = usePathname();

  const roleStrip: Array<{ href: string; label: string; icon: LucideIcon }> = [];
  if (showMyCase) roleStrip.push(myCaseItem);
  if (showManagerHub) roleStrip.push(managerItem);
  if (showCommitteeHub) roleStrip.push(committeeItem);
  if (showInbox) roleStrip.push(inboxItem);

  const items = [baseItems[0], baseItems[1], ...roleStrip, ...baseItems.slice(2)];

  const residentMain: Array<{ href: string; label: string; icon: LucideIcon }> = [];
  for (const href of RESIDENT_MAIN_ORDER) {
    if (href === "/my-case" && !showMyCase) continue;
    const it = itemFromHref(href);
    if (it) residentMain.push(it);
  }
  const residentMore = RESIDENT_MORE_ORDER.map((h) => itemFromHref(h)).filter(
    (x): x is { href: string; label: string; icon: LucideIcon } => x !== undefined,
  );
  const moreRouteActive = residentMore.some(
    (it) => pathname === it.href || pathname.startsWith(it.href + "/"),
  );
  const [moreOpen, setMoreOpen] = useState(moreRouteActive);
  useEffect(() => {
    setMoreOpen(moreRouteActive);
  }, [moreRouteActive]);

  const renderLink = (it: { href: string; label: string; icon: LucideIcon }) => {
    const active = pathname === it.href || pathname.startsWith(it.href + "/");
    const Icon = it.icon;
    return (
      <Link
        key={it.href + it.label}
        href={it.href}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
          active ? "bg-teal-50 text-teal-800" : "text-neutral-700 hover:bg-neutral-50",
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
        {it.label}
      </Link>
    );
  };

  return (
    <aside className="w-60 shrink-0 border-r border-neutral-200 bg-white flex flex-col">
      <div className="px-6 py-5 border-b border-neutral-200">
        <Link href="/dashboard" className="font-serif-brand text-xl font-semibold tracking-tight">
          Parity
        </Link>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {simplifiedResident ? (
          <>
            {residentMain.map((it) => renderLink(it))}
            {residentMore.length > 0 ? (
              <details
                className="pt-0.5 group"
                open={moreOpen}
                onToggle={(e) => setMoreOpen((e.target as HTMLDetailsElement).open)}
              >
                <summary
                  className="flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-neutral-500 hover:bg-neutral-50 marker:content-['']"
                  aria-label="More tools"
                >
                  <span className="text-xs uppercase tracking-wider">More tools</span>
                </summary>
                <div className="ml-0 mt-0 space-y-0.5 border-l border-neutral-200 pl-2">
                  {residentMore.map((it) => renderLink(it))}
                </div>
              </details>
            ) : null}
          </>
        ) : (
          items.map((it) => renderLink(it))
        )}
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
