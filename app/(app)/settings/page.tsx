import { PageShell, PageHeader } from "@/components/shared/page-header";
import { getActiveScheme } from "@/lib/scheme";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";

export default async function SettingsPage() {
  const ctx = await getActiveScheme();
  if (!ctx) return null;

  return (
    <PageShell>
      <PageHeader title="Settings" description="Scheme + profile settings." />
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Scheme</CardTitle>
            <CardDescription>Your active scheme details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><span className="text-neutral-500">Name:</span> {ctx.scheme?.name || "—"}</div>
            <div><span className="text-neutral-500">CMS:</span> {ctx.scheme?.cms_number || "—"}</div>
            <div><span className="text-neutral-500">CTS:</span> {ctx.scheme?.cts_number || "—"}</div>
            <div><span className="text-neutral-500">Module:</span> {ctx.scheme?.regulation_module || "—"}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            Signed in as {ctx.user.email}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
