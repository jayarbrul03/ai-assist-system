import Link from "next/link";
import { DisclaimerStrip } from "@/components/ui/disclaimer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function OnboardingLanding() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Set up your scheme</CardTitle>
          <CardDescription>
            Queensland BCCM schemes only for v1 — we&apos;ll verify your CMS and CTS number, then ingest your registered by-laws.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-1 text-sm text-neutral-700">
            <li>Scheme details (CMS, CTS, address)</li>
            <li>Upload registered by-laws (PDF)</li>
            <li>Invite co-occupants (optional)</li>
          </ol>
          <Button asChild>
            <Link href="/onboarding/scheme">Start setup</Link>
          </Button>
        </CardContent>
      </Card>
      <DisclaimerStrip />
    </div>
  );
}
