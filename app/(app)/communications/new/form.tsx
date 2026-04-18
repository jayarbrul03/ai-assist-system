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
import { STAGES, type StageValue } from "@/lib/comms";
import { Loader2, Sparkles, AlertTriangle } from "lucide-react";

interface EvidenceLink {
  id: string;
  description: string | null;
  occurred_at: string | null;
  issue_flags: string[] | null;
}

export function NewCommsForm({
  schemeId,
  schemeName,
  evidence,
}: {
  schemeId: string;
  schemeName: string;
  evidence: EvidenceLink[];
}) {
  const router = useRouter();
  const [stage, setStage] = useState<StageValue>("stage_1_fyi");
  const [skipReason, setSkipReason] = useState("");
  const [toParty, setToParty] = useState("committee");
  const [toEmail, setToEmail] = useState("");
  const [topic, setTopic] = useState("");
  const [bylawCitations, setBylawCitations] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serving, setServing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moderation, setModeration] = useState<
    | null
    | {
        flagged: boolean;
        issues: Array<{ phrase: string; reason: string; suggestion: string }>;
        overall_risk: string;
      }
  >(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const isSkipping = stage !== "stage_1_fyi";

  async function generate() {
    if (!topic.trim()) {
      setError("Add a short topic first.");
      return;
    }
    setDrafting(true);
    setError(null);
    try {
      const res = await fetch("/api/communications/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemeId,
          stage,
          toParty,
          topic,
          bylawCitations: bylawCitations
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          relatedEvidenceIds: Array.from(selected),
          stageSkipJustification: isSkipping ? skipReason : undefined,
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

  async function save() {
    if (!subject.trim() || !body.trim()) {
      setError("Subject and body required.");
      return;
    }
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

    const citations = bylawCitations
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const { data, error: insErr } = await supabase
      .from("communications")
      .insert({
        scheme_id: schemeId,
        from_user: user.id,
        to_party: toParty,
        to_party_email: toEmail || null,
        stage,
        stage_skip_justification: isSkipping ? skipReason : null,
        subject,
        body,
        bylaw_citations: citations,
        related_evidence_ids: Array.from(selected),
        status: "draft",
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

  async function serve(skipModeration = false) {
    if (!savedId) return;
    setServing(true);
    setError(null);
    setModeration(null);
    const res = await fetch("/api/communications/serve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ communicationId: savedId, skipModeration }),
    });
    const r = await res.json().catch(() => ({}));
    if (res.ok && r.servedAt) {
      router.push(`/communications/${savedId}`);
      return;
    }
    if (r.moderation && r.moderation.flagged) {
      setModeration(r.moderation);
      setServing(false);
      return;
    }
    setError(r.error ?? `HTTP ${res.status}`);
    setServing(false);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Stage</CardTitle>
          <CardDescription>
            Stages enforce procedural fairness. Skipping requires written justification.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            {STAGES.map((s) => (
              <label
                key={s.value}
                className={`flex gap-3 rounded-lg border px-4 py-3 cursor-pointer ${
                  stage === s.value
                    ? "border-teal-600 bg-teal-50"
                    : "border-neutral-200 bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="stage"
                  value={s.value}
                  checked={stage === s.value}
                  onChange={() => setStage(s.value as StageValue)}
                  className="mt-1"
                />
                <div>
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-xs text-neutral-500">{s.description}</p>
                </div>
              </label>
            ))}
          </div>
          {isSkipping ? (
            <div>
              <Label htmlFor="skip">
                Why are you starting at this stage? (required)
              </Label>
              <Textarea
                id="skip"
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
                rows={2}
                className="mt-1"
                required
                placeholder="e.g. Stage 1 was served by email on 10 March and was not responded to within 14 days."
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recipient + topic</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="to">To</Label>
              <select
                id="to"
                value={toParty}
                onChange={(e) => setToParty(e.target.value)}
                className="mt-1 flex h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm"
              >
                <option value="committee">Committee</option>
                <option value="manager">Body corporate manager</option>
                <option value="lot">Another lot</option>
                <option value="external">External party</option>
              </select>
            </div>
            <div>
              <Label htmlFor="email">Recipient email (optional)</Label>
              <Input
                id="email"
                type="email"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="topic">Topic</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="mt-1"
              placeholder="e.g. Towing enforcement on visitor parking without by-law basis"
            />
          </div>
          <div>
            <Label htmlFor="cites">By-law citations (comma-separated, optional)</Label>
            <Input
              id="cites"
              value={bylawCitations}
              onChange={(e) => setBylawCitations(e.target.value)}
              className="mt-1"
              placeholder="e.g. 12.3, 15.1"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Link evidence</CardTitle>
          <CardDescription>
            Select evidence items that support this communication. They&apos;ll be referenced in the draft.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {evidence.length === 0 ? (
            <p className="text-sm text-neutral-500">No evidence yet.</p>
          ) : (
            <ul className="max-h-64 overflow-y-auto divide-y divide-neutral-100">
              {evidence.map((e) => (
                <li key={e.id} className="py-2 flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(e.id)}
                    onChange={() => {
                      const next = new Set(selected);
                      if (next.has(e.id)) next.delete(e.id);
                      else next.add(e.id);
                      setSelected(next);
                    }}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="text-sm">
                      {e.description ?? "(no description)"}
                    </p>
                    <div className="text-xs text-neutral-500 flex gap-2 items-center">
                      <span>{e.occurred_at?.slice(0, 10) ?? "undated"}</span>
                      {(e.issue_flags ?? []).slice(0, 3).map((f) => (
                        <Badge key={f} variant="outline" className="text-[10px]">
                          {f.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Draft</CardTitle>
          <CardDescription>
            Parity generates calm, factual language. Review and edit before serving.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" type="button" onClick={generate} disabled={drafting}>
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
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
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
              rows={14}
              className="mt-1 font-mono text-sm"
            />
          </div>

          {moderation?.flagged ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
              <p className="flex items-center gap-2 font-medium text-amber-900 mb-1">
                <AlertTriangle className="h-4 w-4" />
                Moderation flagged phrasing — risk: {moderation.overall_risk}
              </p>
              <ul className="text-amber-900 list-disc list-inside space-y-0.5">
                {moderation.issues.map((m, i) => (
                  <li key={i}>
                    <strong>&ldquo;{m.phrase}&rdquo;</strong> — {m.reason}. Try: {m.suggestion}
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => serve(true)}
                disabled={serving}
              >
                Serve anyway
              </Button>
            </div>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex gap-2">
            {!savedId ? (
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save draft"}
              </Button>
            ) : (
              <Button onClick={() => serve()} disabled={serving}>
                {serving ? "Serving…" : "Serve"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
