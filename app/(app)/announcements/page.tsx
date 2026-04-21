import { redirect } from "next/navigation";
import { getActiveScheme } from "@/lib/scheme";
import { createClient } from "@/lib/supabase/server";
import { PageShell, PageHeader } from "@/components/shared/page-header";
import { AnnouncementsView } from "./announcements-view";

export default async function AnnouncementsPage() {
  const ctx = await getActiveScheme();
  if (!ctx) redirect("/login");
  if (!ctx.scheme) redirect("/onboarding");

  const supabase = await createClient();
  const { data } = await supabase
    .from("scheme_announcements")
    .select("*")
    .eq("scheme_id", ctx.scheme.id)
    .order("pinned", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(50);

  const role = ctx.membership?.role ?? "owner";
  const canPublish =
    role === "committee_chair" ||
    role === "committee_member" ||
    role === "manager";

  return (
    <PageShell>
      <PageHeader
        title="Scheme announcements"
        description="Committee and manager updates for everyone in the scheme. In-app only — no email yet."
      />
      <AnnouncementsView
        schemeId={ctx.scheme.id}
        canPublish={canPublish}
        initial={(data ?? []) as Array<{
          id: string;
          title: string;
          body: string;
          tone: string;
          pinned: boolean;
          published_at: string;
          posted_by: string | null;
        }>}
      />
    </PageShell>
  );
}
