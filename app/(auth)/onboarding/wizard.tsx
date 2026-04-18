"use client";

import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { DisclaimerStrip } from "@/components/ui/disclaimer";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, CheckCircle2 } from "lucide-react";

type Step = 1 | 2 | 3 | 4;

const MODULES = [
  "Standard Module",
  "Accommodation Module",
  "Commercial Module",
  "Small Schemes Module",
  "Specified Two-lot Schemes Module",
];

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [schemeId, setSchemeId] = useState<string | null>(null);

  // Step 1 fields
  const [name, setName] = useState("");
  const [cms, setCms] = useState("");
  const [cts, setCts] = useState("");
  const [address, setAddress] = useState("");
  const [module, setModule] = useState<string>(MODULES[0]);
  const [lotNumber, setLotNumber] = useState("");

  // Step 2
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [ingestStatus, setIngestStatus] = useState<string | null>(null);
  const [ingested, setIngested] = useState<{ chunks: number; pages: number } | null>(
    null,
  );

  // Step 3
  const [invitees, setInvitees] = useState("");

  const [error, setError] = useState<string | null>(null);

  async function submitScheme(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be signed in.");
      return;
    }

    const { data: scheme, error: sErr } = await supabase
      .from("schemes")
      .insert({
        name,
        cms_number: cms || null,
        cts_number: cts || null,
        address: address || null,
        regulation_module: module,
        onboarded_by: user.id,
      })
      .select("*")
      .single();

    if (sErr || !scheme) {
      setError(sErr?.message ?? "Could not create scheme");
      return;
    }

    const { error: mErr } = await supabase.from("scheme_memberships").insert({
      user_id: user.id,
      scheme_id: scheme.id,
      role: "owner",
      lot_number: lotNumber || null,
    });
    if (mErr) {
      setError(mErr.message);
      return;
    }

    setSchemeId(scheme.id);
    setStep(2);
  }

  async function uploadBylaws(e: React.FormEvent) {
    e.preventDefault();
    if (!schemeId || !fileRef.current?.files?.[0]) return;
    const file = fileRef.current.files[0];

    setUploading(true);
    setIngestStatus("Uploading PDF…");
    setError(null);

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("schemeId", schemeId);
      form.append("title", file.name);

      setIngestStatus("Parsing by-laws…");
      const res = await fetch("/api/ingest", { method: "POST", body: form });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Ingest failed (${res.status})`);
      }
      const { chunks, pages } = (await res.json()) as {
        chunks: number;
        pages: number;
      };
      setIngested({ chunks, pages });
      setIngestStatus(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setIngestStatus(null);
    } finally {
      setUploading(false);
    }
  }

  function finish() {
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Stepper current={step} />

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>Scheme details</CardTitle>
            <CardDescription>
              Queensland BCCM schemes only for v1. You can edit these later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitScheme} className="space-y-4">
              <div>
                <Label htmlFor="name">Scheme name</Label>
                <Input
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Riverbend Apartments CTS 12345"
                  className="mt-1"
                />
              </div>
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
              <div>
                <Label htmlFor="lot">Your lot number (optional)</Label>
                <Input
                  id="lot"
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                  placeholder="e.g. 12"
                  className="mt-1"
                />
              </div>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <Button type="submit" className="w-full">
                Continue
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>Upload registered by-laws</CardTitle>
            <CardDescription>
              PDF of your scheme&apos;s registered by-laws (CMS filing). Parity parses
              by by-law provision, embeds each one, and stores it in your private
              scheme corpus.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={uploadBylaws} className="space-y-4">
              <label
                htmlFor="bylaws-file"
                className="flex items-center justify-center h-32 border-2 border-dashed border-neutral-300 rounded-lg cursor-pointer hover:bg-neutral-50"
              >
                <div className="flex flex-col items-center gap-2 text-sm text-neutral-600">
                  <Upload className="h-5 w-5" />
                  <span>Click to select a PDF</span>
                </div>
                <input
                  id="bylaws-file"
                  ref={fileRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                />
              </label>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              {ingestStatus ? (
                <p className="text-sm text-teal-700 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> {ingestStatus}
                </p>
              ) : null}
              {ingested ? (
                <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm">
                  <p className="flex items-center gap-2 text-teal-800 font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    Ingested {ingested.chunks} provisions across {ingested.pages} pages.
                  </p>
                </div>
              ) : null}
              <div className="flex gap-2">
                <Button type="submit" disabled={uploading}>
                  {uploading ? "Processing…" : "Upload & ingest"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(3)}
                  disabled={uploading}
                >
                  {ingested ? "Continue" : "Skip for now"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card>
          <CardHeader>
            <CardTitle>Invite co-occupants</CardTitle>
            <CardDescription>
              Optional. Add emails — one per line. You can always do this later
              from Settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Textarea
                value={invitees}
                onChange={(e) => setInvitees(e.target.value)}
                placeholder="neighbour@example.com"
                rows={4}
              />
              <p className="text-xs text-neutral-500">
                Invites send in a future phase. For now, emails are stored for
                reference.
              </p>
              <div className="flex gap-2">
                <Button onClick={() => setStep(4)}>Continue</Button>
                <Button variant="outline" onClick={() => setStep(4)}>
                  Skip
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 4 ? (
        <Card>
          <CardHeader>
            <CardTitle>You&apos;re set.</CardTitle>
            <CardDescription>
              Your scheme is onboarded. Next: ask Rulebook AI a question, or start a
              case file.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={finish}>Open dashboard</Button>
          </CardContent>
        </Card>
      ) : null}

      <DisclaimerStrip />
    </div>
  );
}

function Stepper({ current }: { current: Step }) {
  const labels = ["Scheme", "By-laws", "Invite", "Done"];
  return (
    <ol className="flex items-center justify-between text-xs">
      {labels.map((l, i) => {
        const n = (i + 1) as Step;
        const active = n === current;
        const done = n < current;
        return (
          <li key={l} className="flex items-center gap-2 flex-1">
            <Badge
              variant={done ? "default" : active ? "warning" : "secondary"}
              className="w-6 h-6 justify-center p-0 text-xs"
            >
              {n}
            </Badge>
            <span className={active ? "text-teal-800 font-medium" : "text-neutral-500"}>
              {l}
            </span>
            {i < labels.length - 1 ? (
              <div className="h-px flex-1 bg-neutral-200" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
