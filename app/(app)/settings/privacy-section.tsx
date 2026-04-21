"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Shield, Download, FileJson } from "lucide-react";

type Policy = "ask" | "fast_release" | "refuse";

export function PrivacySection({
  schemeId,
  initialPolicy,
}: {
  schemeId: string;
  initialPolicy: Policy;
}) {
  const [policy, setPolicy] = useState<Policy>(initialPolicy);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState(false);

  async function savePolicy(next: Policy) {
    setSaving(true);
    setSaved(false);
    setError(null);
    setPolicy(next);
    try {
      const res = await fetch("/api/me/privacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schemeId, policy: next }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function exportData() {
    setExportBusy(true);
    try {
      const res = await fetch(`/api/me/export?schemeId=${schemeId}`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `parity-my-data-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExportBusy(false);
    }
  }

  return (
    <Card id="privacy">
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-teal-50 text-teal-700 shrink-0">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>My data &amp; privacy</CardTitle>
            <CardDescription className="mt-1">
              Set how Parity handles investigation requests that touch your
              private data, and export your full record at any time.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label>Investigation default policy</Label>
          <p className="text-xs text-neutral-500 mb-3 mt-0.5">
            If your committee or manager opens an investigation, how should
            Parity handle consent on your private data?
          </p>
          <div className="grid gap-2">
            <PolicyOption
              value="ask"
              current={policy}
              onSelect={savePolicy}
              title="Ask me every time"
              description="Default. You get a dashboard prompt for each investigation. You choose: release, release redacted, or refuse."
            />
            <PolicyOption
              value="fast_release"
              current={policy}
              onSelect={savePolicy}
              title="Fast-release"
              description="Auto-approve any investigation request on your scheme-shared data. Still notified. Great for cooperative schemes."
            />
            <PolicyOption
              value="refuse"
              current={policy}
              onSelect={savePolicy}
              title="Refuse by default"
              description="Auto-decline all investigation consent requests. You can override per-request. Protective."
            />
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs">
            {saving ? (
              <span className="text-neutral-500">Saving…</span>
            ) : saved ? (
              <Badge variant="success">Saved</Badge>
            ) : null}
            {error ? <span className="text-red-600">{error}</span> : null}
          </div>
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50/40 p-3 text-sm">
          <p className="font-medium text-red-900 flex items-center gap-2">
            <Shield className="h-4 w-4" /> Permanent shield
          </p>
          <p className="text-red-900/90 text-xs mt-1 leading-relaxed">
            Your <strong>Impact Log entries</strong> and <strong>private
            Rulebook AI conversations</strong> are never released under any
            investigation, regardless of your policy or consent. This protects
            your personal wellbeing data from coercion.
          </p>
        </div>

        <div className="border-t border-neutral-100 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-sm">Export my data</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                Download everything you own in this scheme as JSON — evidence,
                communications, records requests, impact entries, issues, chat,
                and audit log. Your data, your record.
              </p>
            </div>
            <Button
              onClick={exportData}
              disabled={exportBusy}
              variant="outline"
            >
              {exportBusy ? (
                "Preparing…"
              ) : (
                <>
                  <FileJson className="h-4 w-4" /> Download JSON
                </>
              )}
            </Button>
          </div>
          <div className="mt-3">
            <Button asChild variant="ghost" size="sm">
              <a href="/export">
                <Download className="h-4 w-4" /> Or generate a case-file PDF
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PolicyOption({
  value,
  current,
  onSelect,
  title,
  description,
}: {
  value: Policy;
  current: Policy;
  onSelect: (v: Policy) => void;
  title: string;
  description: string;
}) {
  const active = value === current;
  return (
    <label
      className={`flex gap-3 rounded-lg border px-4 py-3 cursor-pointer transition ${
        active
          ? "border-teal-600 bg-teal-50"
          : "border-neutral-200 bg-white hover:bg-neutral-50"
      }`}
    >
      <input
        type="radio"
        name="policy"
        value={value}
        checked={active}
        onChange={() => onSelect(value)}
        className="mt-1"
      />
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-neutral-500 leading-snug mt-0.5">
          {description}
        </p>
      </div>
    </label>
  );
}
