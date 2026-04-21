import { redirect } from "next/navigation";
import { getActiveScheme } from "@/lib/scheme";
import { createClient } from "@/lib/supabase/server";
import { PageShell, PageHeader } from "@/components/shared/page-header";
import { SchemeSettingsForm } from "./scheme-form";
import { BylawsLibrary } from "./bylaws-library";
import { PrivacySection } from "./privacy-section";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";

export default async function SettingsPage() {
  const ctx = await getActiveScheme();
  if (!ctx) redirect("/login");
  if (!ctx.scheme) redirect("/onboarding");

  const supabase = await createClient();
  const { data: docs } = await supabase
    .from("bylaws_documents")
    .select("id, title, source_type, created_at")
    .eq("scheme_id", ctx.scheme.id)
    .order("created_at", { ascending: false });

  const { count: chunkCount } = await supabase
    .from("bylaws_chunks")
    .select("id", { count: "exact", head: true })
    .eq("scheme_id", ctx.scheme.id);

  return (
    <PageShell>
      <PageHeader
        title="Settings"
        description="Your scheme details, by-laws library, and profile."
      />
      <div className="grid gap-4">
        <SchemeSettingsForm
          scheme={{
            id: ctx.scheme.id,
            name: ctx.scheme.name,
            cms_number: ctx.scheme.cms_number,
            cts_number: ctx.scheme.cts_number,
            address: ctx.scheme.address,
            regulation_module: ctx.scheme.regulation_module,
          }}
          lotNumber={ctx.membership?.lot_number ?? null}
          membershipId={ctx.membership?.id ?? null}
        />
        <BylawsLibrary
          schemeId={ctx.scheme.id}
          documents={(docs ?? []) as Array<{
            id: string;
            title: string;
            source_type: string | null;
            created_at: string;
          }>}
          chunkCount={chunkCount ?? 0}
        />
        <PrivacySection
          schemeId={ctx.scheme.id}
          initialPolicy={
            (ctx.membership as { investigation_default_policy?: "ask" | "fast_release" | "refuse" } | null)
              ?.investigation_default_policy ?? "ask"
          }
        />
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Account details</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <div>
              <span className="text-neutral-500">Signed in as:</span>{" "}
              {ctx.user.email}
            </div>
            <div className="mt-1">
              <span className="text-neutral-500">Role:</span>{" "}
              {ctx.membership?.role?.replace(/_/g, " ") ?? "—"}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
