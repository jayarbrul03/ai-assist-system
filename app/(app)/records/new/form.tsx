"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";

const TYPES = [
  "minutes",
  "correspondence",
  "cctv",
  "towing_records",
  "contractor_instructions",
  "committee_decisions",
  "budget_financials",
  "insurance",
  "registered_bylaws",
];

export function NewRecordsForm({ schemeId }: { schemeId: string }) {
  const router = useRouter();
  const [types, setTypes] = useState<string[]>([]);
  const [specific, setSpecific] = useState("");
  const [feeAck, setFeeAck] = useState(true);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  function toggle(t: string) {
    setTypes(types.includes(t) ? types.filter((x) => x !== t) : [...types, t]);
  }

  async function generate() {
    if (types.length === 0) {
      setError("Select at least one record type.");
      return;
    }
    setDrafting(true);
    setError(null);
    try {
      const res = await fetch("/api/records/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemeId,
          requestTypes: types,
          specificItems: specific,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const r = (await res.json()) as { subject: string; body: string };
      setSubject(r.subject);
      setBody(r.body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Draft failed");
    } finally {
      setDrafting(false);
    }
  }

  async function saveDraft() {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not signed in");
      setSaving(false);
      return;
    }

    const { data, error: insErr } = await supabase
      .from("records_requests")
      .insert({
        scheme_id: schemeId,
        requester_id: user.id,
        request_type: types,
        specific_items: specific || null,
        fee_acknowledged: feeAck,
        status: "draft",
        notes: body ? `subject: ${subject}\n\n${body}` : null,
      })
      .select("id")
      .single();

    if (insErr) {
      setError(insErr.message);
      setSaving(false);
      return;
    }
    setSavedId(data?.id ?? null);
    setSaving(false);
  }

  async function markServed() {
    if (!savedId) return;
    setSaving(true);
    const supabase = createClient();
    const servedAt = new Date();
    const deadline = new Date(servedAt);
    deadline.setDate(deadline.getDate() + 7);

    const { error: upErr } = await supabase
      .from("records_requests")
      .update({
        status: "submitted",
        submitted_at: servedAt.toISOString(),
        served_at: servedAt.toISOString(),
        statutory_deadline: deadline.toISOString(),
      })
      .eq("id", savedId);
    if (upErr) {
      setError(upErr.message);
      setSaving(false);
      return;
    }

    await supabase.from("audit_log").insert({
      action: "records_submitted",
      entity_type: "records_requests",
      entity_id: savedId,
      scheme_id: schemeId,
      metadata: { deadline: deadline.toISOString() },
    });
    router.push(`/records/${savedId}`);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">What are you requesting?</CardTitle>
          <CardDescription>Pick every type you need. You can add specifics below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggle(t)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  types.includes(t)
                    ? "bg-teal-50 border-teal-300 text-teal-800"
                    : "bg-white border-neutral-300"
                }`}
              >
                {t.replace(/_/g, " ")}
              </button>
            ))}
          </div>
          <div>
            <Label htmlFor="specific">Specific items</Label>
            <Textarea
              id="specific"
              value={specific}
              onChange={(e) => setSpecific(e.target.value)}
              rows={3}
              className="mt-1"
              placeholder="e.g. Committee minutes from 2024-01-01 to 2024-06-30, all correspondence with towing contractor."
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={feeAck}
              onChange={(e) => setFeeAck(e.target.checked)}
            />
            I acknowledge reasonable copy fees may apply. <Badge variant="secondary">Recommended</Badge>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Draft</CardTitle>
          <CardDescription>
            Parity generates a BCCM-compliant request. Review and edit before serving.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button type="button" variant="outline" onClick={generate} disabled={drafting}>
            {drafting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Drafting…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Generate draft
              </>
            )}
          </Button>
          <div>
            <Label htmlFor="subj">Subject</Label>
            <Input
              id="subj"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="body">Body</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              className="mt-1 font-mono text-sm"
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex gap-2">
            {!savedId ? (
              <Button onClick={saveDraft} disabled={saving}>
                {saving ? "Saving…" : "Save draft"}
              </Button>
            ) : (
              <Button onClick={markServed} disabled={saving}>
                {saving ? "Saving…" : "Mark as served"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
