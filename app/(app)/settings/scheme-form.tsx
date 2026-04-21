"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const MODULES = [
  "Standard Module",
  "Accommodation Module",
  "Commercial Module",
  "Small Schemes Module",
  "Specified Two-lot Schemes Module",
];

export function SchemeSettingsForm({
  scheme,
  lotNumber,
  membershipId,
}: {
  scheme: {
    id: string;
    name: string;
    cms_number: string | null;
    cts_number: string | null;
    address: string | null;
    regulation_module: string | null;
  };
  lotNumber: string | null;
  membershipId: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(scheme.name ?? "");
  const [cms, setCms] = useState(scheme.cms_number ?? "");
  const [cts, setCts] = useState(scheme.cts_number ?? "");
  const [address, setAddress] = useState(scheme.address ?? "");
  const [module, setModule] = useState(scheme.regulation_module ?? MODULES[0]);
  const [lot, setLot] = useState(lotNumber ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const supabase = createClient();

    const { error: upErr } = await supabase
      .from("schemes")
      .update({
        name: name || `Scheme ${scheme.id.slice(0, 6)}`,
        cms_number: cms || null,
        cts_number: cts || null,
        address: address || null,
        regulation_module: module || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", scheme.id);

    if (upErr) {
      setError(upErr.message);
      setSaving(false);
      return;
    }

    if (membershipId) {
      await supabase
        .from("scheme_memberships")
        .update({ lot_number: lot || null })
        .eq("id", membershipId);
    }

    setSaved(true);
    setSaving(false);
    router.refresh();
  }

  const completion = completionPct({ name, cms, cts, address, module, lot });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Scheme details</CardTitle>
            <CardDescription>
              Fill in what you know now. You can always come back. Nothing here
              is required to start using Parity.
            </CardDescription>
          </div>
          <Badge variant={completion === 100 ? "success" : "secondary"}>
            {completion}% complete
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-4">
          <div>
            <Label htmlFor="name">Scheme name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Riverbend Residences"
              className="mt-1"
            />
            <p className="text-xs text-neutral-500 mt-1">
              Whatever you know it as.
            </p>
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, suburb, QLD, postcode"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="lot">Your lot number</Label>
              <Input
                id="lot"
                value={lot}
                onChange={(e) => setLot(e.target.value)}
                placeholder="e.g. 12"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="module">Regulation module</Label>
              <select
                id="module"
                value={module}
                onChange={(e) => setModule(e.target.value)}
                className="mt-1 flex h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm"
              >
                {MODULES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <details className="rounded-lg border border-neutral-200 p-3">
            <summary className="text-sm font-medium cursor-pointer">
              Know your CMS / CTS numbers? Add them here.
            </summary>
            <p className="text-xs text-neutral-500 mt-2 mb-3">
              These live on your scheme&apos;s CMS filing. If you don&apos;t
              have them, leave blank and file a records request later.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="cms">CMS number</Label>
                <Input
                  id="cms"
                  value={cms}
                  onChange={(e) => setCms(e.target.value)}
                  placeholder="CMS-2019-…"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="cts">CTS number</Label>
                <Input
                  id="cts"
                  value={cts}
                  onChange={(e) => setCts(e.target.value)}
                  placeholder="12345"
                  className="mt-1"
                />
              </div>
            </div>
          </details>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {saved ? (
            <p className="text-sm text-teal-700">Saved.</p>
          ) : null}
        </form>
      </CardContent>
      <CardFooter>
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </CardFooter>
    </Card>
  );
}

function completionPct(args: {
  name: string;
  cms: string;
  cts: string;
  address: string;
  module: string;
  lot: string;
}): number {
  const checks = [
    args.name && !args.name.includes("scheme —"),
    args.cms,
    args.cts,
    args.address,
    args.module,
    args.lot,
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}
