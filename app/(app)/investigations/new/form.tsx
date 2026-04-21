"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle } from "lucide-react";
import type { InvestigationBasis } from "@/lib/investigations";

const BASES: Array<{ value: InvestigationBasis; label: string; hint: string }> = [
  {
    value: "bccm_commissioner_dispute",
    label: "BCCM Commissioner dispute",
    hint: "Complaint lodged with or imminent at the Commissioner's office.",
  },
  {
    value: "insurance_claim",
    label: "Insurance claim",
    hint: "Public liability, property, or defamation insurer request.",
  },
  {
    value: "regulatory_inquiry",
    label: "Regulatory inquiry",
    hint: "Fair Trading, ombudsman, or similar.",
  },
  {
    value: "internal_review",
    label: "Internal review",
    hint: "Committee or manager conducting a good-faith internal investigation.",
  },
  {
    value: "other",
    label: "Other",
    hint: "Describe below.",
  },
];

export function NewInvestigationForm({ schemeId }: { schemeId: string }) {
  const router = useRouter();
  const [basis, setBasis] = useState<InvestigationBasis>("internal_review");
  const [detail, setDetail] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    if (!detail.trim()) {
      setError("Please describe the basis in 1–2 sentences for the record.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/investigations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemeId,
          basis,
          basisDetail: detail,
          scopeFrom: from || undefined,
          scopeTo: to || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const j = await res.json();
      router.push(`/investigations/${j.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open investigation");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basis</CardTitle>
          <CardDescription>
            Every investigation is logged. The reason is stored in the audit
            trail and shown on the export bundle cover.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            {BASES.map((b) => (
              <label
                key={b.value}
                className={`flex gap-3 rounded-lg border px-4 py-3 cursor-pointer ${
                  basis === b.value
                    ? "border-teal-600 bg-teal-50"
                    : "border-neutral-200 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="basis"
                  value={b.value}
                  checked={basis === b.value}
                  onChange={() => setBasis(b.value)}
                  className="mt-1"
                />
                <div>
                  <p className="text-sm font-medium">{b.label}</p>
                  <p className="text-xs text-neutral-500">{b.hint}</p>
                </div>
              </label>
            ))}
          </div>
          <div>
            <Label htmlFor="detail">
              Describe the basis <span className="text-red-600">*</span>
            </Label>
            <Textarea
              id="detail"
              rows={3}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              className="mt-1"
              placeholder="e.g. Commissioner file 123456 lodged by Lot 7; insurer needs communications from Jan to Mar."
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="from">Scope from</Label>
              <Input
                id="from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="to">Scope to</Label>
              <Input
                id="to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-4 w-4 text-teal-700" /> What you&apos;ll get
          </CardTitle>
          <CardDescription>
            Data tiering is automatic. Opening an investigation does not
            instantly hand you private information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <Badge variant="success" className="mt-0.5">Tier 1</Badge>
            <p className="text-neutral-700">
              <strong>Scheme-public data</strong> — committee communications,
              announcements, records requests, minutes. Available immediately.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="success" className="mt-0.5">Tier 2</Badge>
            <p className="text-neutral-700">
              <strong>Shared-to-scheme evidence</strong> — items members have
              explicitly ticked &ldquo;share&rdquo;. Available immediately.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="warning" className="mt-0.5">Tier 3</Badge>
            <p className="text-neutral-700">
              <strong>Member-private communications and evidence</strong> — each
              affected person gets a consent request. They may release, release
              redacted, or refuse. Refusals are counted but never attributed to a
              name.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Badge variant="danger" className="mt-0.5">Tier 4</Badge>
            <p className="text-neutral-700">
              <strong>Personal wellbeing data — never released.</strong> Impact
              Log entries and private Rulebook AI conversations are permanently
              shielded under any investigation. This protects every member,
              including committee.
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 text-xs flex gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              Opening an investigation is a recorded act. Members will be
              notified. Use this for genuine legal, insurance, or regulatory
              needs — not fishing expeditions.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          {error ? <p className="text-sm text-red-600 mr-3">{error}</p> : null}
          <Button onClick={open} disabled={busy}>
            {busy ? "Opening…" : "Open investigation"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
