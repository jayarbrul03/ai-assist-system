"use client";

import { useRef, useState } from "react";
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
import { Loader2, Upload, Sparkles } from "lucide-react";

const SOURCES = [
  "screenshot",
  "email",
  "sms",
  "notice",
  "photo",
  "video",
  "audio",
  "cctv",
  "facebook_post",
  "conversation",
  "witness_account",
  "note",
];

const IMPACT_FLAGS = [
  "anxiety",
  "distress",
  "embarrassment",
  "disruption",
  "fear",
  "financial_cost",
  "interference_with_enjoyment",
];

const ISSUE_FLAGS = [
  "overreach",
  "selective_enforcement",
  "invalid_direction",
  "procedural_defect",
  "nuisance",
  "intimidation",
  "reputational_targeting",
  "towing_pressure",
  "privacy_concern",
  "records_issue",
];

export function NewEvidenceForm({ schemeId }: { schemeId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [analysing, setAnalysing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  // Form fields (pre-populated from AI)
  const [occurredAt, setOccurredAt] = useState("");
  const [approximate, setApproximate] = useState(false);
  const [location, setLocation] = useState("");
  const [source, setSource] = useState<string>("note");
  const [description, setDescription] = useState("");
  const [exactWords, setExactWords] = useState("");
  const [ruleCited, setRuleCited] = useState("");
  const [ruleSource, setRuleSource] = useState("unknown");
  const [impactFlags, setImpactFlags] = useState<string[]>([]);
  const [issueFlags, setIssueFlags] = useState<string[]>([]);
  const [confidence, setConfidence] = useState("unclear");
  const [nextAction, setNextAction] = useState("file_only");
  const [aiSummary, setAiSummary] = useState("");
  const [shared, setShared] = useState(false);

  function toggle(list: string[], setter: (v: string[]) => void, value: string) {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function analyse() {
    setAnalysing(true);
    setError(null);
    try {
      let res: Response;
      const f = fileRef.current?.files?.[0] ?? null;
      if (f) {
        const form = new FormData();
        form.append("file", f);
        if (text.trim()) form.append("text", text);
        res = await fetch("/api/evidence/analyse", { method: "POST", body: form });
      } else {
        res = await fetch("/api/evidence/analyse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const r = await res.json();
      if (r.occurred_at) setOccurredAt(r.occurred_at.slice(0, 16));
      setApproximate(!!r.occurred_at_approximate);
      if (r.location) setLocation(r.location);
      if (r.source) setSource(r.source);
      if (r.description) setDescription(r.description);
      if (r.exact_words) setExactWords(r.exact_words);
      if (r.rule_cited) setRuleCited(r.rule_cited);
      if (r.rule_source) setRuleSource(r.rule_source);
      if (Array.isArray(r.impact_flags)) setImpactFlags(r.impact_flags);
      if (Array.isArray(r.issue_flags)) setIssueFlags(r.issue_flags);
      if (r.confidence) setConfidence(r.confidence);
      if (r.suggested_next_action) setNextAction(r.suggested_next_action);
      if (r.ai_summary) setAiSummary(r.ai_summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analyse failed");
    } finally {
      setAnalysing(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
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

    // Upload file if present
    let fileUrl: string | null = null;
    const f = fileRef.current?.files?.[0];
    if (f) {
      const path = `${schemeId}/${user.id}/${Date.now()}-${f.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: upErr } = await supabase.storage
        .from("evidence")
        .upload(path, f, { contentType: f.type });
      if (!upErr) fileUrl = path;
    }

    const { data, error: insErr } = await supabase
      .from("evidence_items")
      .insert({
        scheme_id: schemeId,
        uploaded_by: user.id,
        shared_with_scheme: shared,
        occurred_at: occurredAt ? new Date(occurredAt).toISOString() : null,
        occurred_at_approximate: approximate,
        location: location || null,
        source,
        file_url: fileUrl,
        description: description || null,
        exact_words: exactWords || null,
        rule_cited: ruleCited || null,
        rule_source: ruleSource || null,
        impact_flags: impactFlags,
        issue_flags: issueFlags,
        confidence,
        next_action: nextAction,
        ai_summary: aiSummary || null,
      })
      .select("id")
      .single();

    if (insErr) {
      setError(insErr.message);
      setSaving(false);
      return;
    }

    // Audit log (best-effort)
    await supabase.from("audit_log").insert({
      user_id: user.id,
      scheme_id: schemeId,
      action: "evidence_created",
      entity_type: "evidence_items",
      entity_id: data?.id ?? null,
    });

    router.push(`/evidence/${data?.id}`);
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Input</CardTitle>
          <CardDescription>Upload or paste. Both are allowed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Upload file (optional)</Label>
            <label
              htmlFor="ev-file"
              className="mt-1 flex items-center justify-center h-24 border-2 border-dashed border-neutral-300 rounded-lg cursor-pointer hover:bg-neutral-50"
            >
              <div className="flex flex-col items-center gap-1 text-sm text-neutral-600">
                <Upload className="h-4 w-4" />
                <span>{file ? file.name : "Click to select a screenshot, photo, or PDF"}</span>
              </div>
              <input
                id="ev-file"
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                accept="image/*,application/pdf"
              />
            </label>
          </div>
          <div>
            <Label htmlFor="paste">Paste text (email, SMS, notice, etc.)</Label>
            <Textarea
              id="paste"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              className="mt-1"
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="button" variant="outline" onClick={analyse} disabled={analysing}>
            {analysing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Analysing…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Analyse with Parity
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Details</CardTitle>
          <CardDescription>Review and edit before saving.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="occurred">When it happened</Label>
              <Input
                id="occurred"
                type="datetime-local"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                className="mt-1"
              />
              <label className="mt-1 flex items-center gap-2 text-xs text-neutral-500">
                <input
                  type="checkbox"
                  checked={approximate}
                  onChange={(e) => setApproximate(e.target.checked)}
                />
                Approximate
              </label>
            </div>
            <div>
              <Label htmlFor="src">Source</Label>
              <select
                id="src"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="mt-1 flex h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm"
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Label htmlFor="loc">Location</Label>
            <Input
              id="loc"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="desc">Neutral description</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="exact">Exact words (verbatim, if any)</Label>
            <Textarea
              id="exact"
              value={exactWords}
              onChange={(e) => setExactWords(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rule">Rule cited by BC</Label>
              <Input
                id="rule"
                value={ruleCited}
                onChange={(e) => setRuleCited(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="rsrc">Rule source</Label>
              <select
                id="rsrc"
                value={ruleSource}
                onChange={(e) => setRuleSource(e.target.value)}
                className="mt-1 flex h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm"
              >
                {["registered_bylaws","signage","verbal","facebook","committee_minutes","unknown"].map(
                  (s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          <div>
            <Label>Impact flags</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {IMPACT_FLAGS.map((f) => (
                <button
                  type="button"
                  key={f}
                  onClick={() => toggle(impactFlags, setImpactFlags, f)}
                  className={`rounded-full border px-2.5 py-1 text-xs ${
                    impactFlags.includes(f)
                      ? "bg-amber-50 border-amber-300 text-amber-900"
                      : "bg-white border-neutral-300"
                  }`}
                >
                  {f.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Issue flags</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {ISSUE_FLAGS.map((f) => (
                <button
                  type="button"
                  key={f}
                  onClick={() => toggle(issueFlags, setIssueFlags, f)}
                  className={`rounded-full border px-2.5 py-1 text-xs ${
                    issueFlags.includes(f)
                      ? "bg-teal-50 border-teal-300 text-teal-800"
                      : "bg-white border-neutral-300"
                  }`}
                >
                  {f.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="conf">Confidence</Label>
              <select
                id="conf"
                value={confidence}
                onChange={(e) => setConfidence(e.target.value)}
                className="mt-1 flex h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm"
              >
                {["confirmed","likely","unclear"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="next">Next action</Label>
              <select
                id="next"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                className="mt-1 flex h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm"
              >
                {["file_only","seek_records","draft_response","legal_review","include_in_timeline","preserve_for_complaint_bundle"].map(
                  (s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          {aiSummary ? (
            <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm">
              <p className="font-medium text-teal-800 mb-1 flex items-center gap-1">
                <Sparkles className="h-4 w-4" /> AI summary
              </p>
              <p className="text-teal-900">{aiSummary}</p>
            </div>
          ) : null}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={shared}
              onChange={(e) => setShared(e.target.checked)}
            />
            Share with scheme (optional). <Badge variant="secondary">Default off</Badge>
          </label>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save evidence"}
        </Button>
      </div>
    </form>
  );
}
