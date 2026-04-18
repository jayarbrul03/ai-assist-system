"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { DisclaimerStrip } from "@/components/ui/disclaimer";
import { Download, Loader2 } from "lucide-react";

const SECTION_OPTIONS = [
  { key: "cover", label: "Cover page" },
  { key: "executiveSummary", label: "Executive summary" },
  { key: "timeline", label: "Master timeline" },
  { key: "evidence", label: "Evidence register" },
  { key: "communications", label: "Communications register" },
  { key: "records", label: "Records requests register" },
  { key: "issues", label: "Legal issues register" },
  { key: "impact", label: "Impact log summary" },
  { key: "audit", label: "Audit log" },
];

export function ExportForm({ schemeId }: { schemeId: string }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sections, setSections] = useState<Record<string, boolean>>(
    () =>
      SECTION_OPTIONS.reduce((acc, s) => ({ ...acc, [s.key]: true }), {}) as Record<
        string,
        boolean
      >,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemeId,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          sections,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `parity-case-file-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Scope</CardTitle>
          <CardDescription>
            Filter by date range and choose which sections to include.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="from">From</Label>
              <Input
                id="from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Sections</Label>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SECTION_OPTIONS.map((s) => (
                <label key={s.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!sections[s.key]}
                    onChange={(e) =>
                      setSections({ ...sections, [s.key]: e.target.checked })
                    }
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </div>
          <Badge variant="secondary">
            Every page includes the &ldquo;not legal advice&rdquo; disclaimer and a
            scheme + generation footer.
          </Badge>
        </CardContent>
      </Card>

      <DisclaimerStrip />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button onClick={generate} disabled={busy}>
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Generating PDF…
          </>
        ) : (
          <>
            <Download className="h-4 w-4" /> Generate PDF
          </>
        )}
      </Button>
    </div>
  );
}
