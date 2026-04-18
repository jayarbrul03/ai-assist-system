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
import { formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";

interface Issue {
  id: string;
  issue_type: string | null;
  headline: string | null;
  detail: string | null;
  related_evidence_ids: string[];
  status: string;
  confidence: string;
  next_step: string | null;
  created_at: string;
}

interface Ev {
  id: string;
  description: string | null;
  occurred_at: string | null;
  issue_flags: string[] | null;
}

const ISSUE_TYPES = [
  "overreach",
  "selective_enforcement",
  "towing_misuse",
  "nuisance",
  "records_failure",
  "committee_conduct",
  "signage_mismatch",
  "discrimination_flag",
  "distress_impact",
];

export function IssuesView({
  schemeId,
  issues,
  evidence,
}: {
  schemeId: string;
  issues: Issue[];
  evidence: Ev[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState("overreach");
  const [headline, setHeadline] = useState("");
  const [detail, setDetail] = useState("");
  const [confidence, setConfidence] = useState("unclear");
  const [nextStep, setNextStep] = useState("");
  const [linked, setLinked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createIssue(e: React.FormEvent) {
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
    const { error: insErr } = await supabase.from("legal_issues").insert({
      scheme_id: schemeId,
      raised_by: user.id,
      issue_type: type,
      headline,
      detail: detail || null,
      related_evidence_ids: Array.from(linked),
      confidence,
      next_step: nextStep || null,
      status: "open",
    });
    if (insErr) {
      setError(insErr.message);
      setSaving(false);
      return;
    }
    await supabase.from("audit_log").insert({
      action: "issue_raised",
      entity_type: "legal_issues",
      scheme_id: schemeId,
      metadata: { type, headline },
    });
    setAdding(false);
    setHeadline("");
    setDetail("");
    setLinked(new Set());
    setNextStep("");
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setAdding(!adding)}>
          <Plus className="h-4 w-4" /> {adding ? "Cancel" : "Add issue"}
        </Button>
      </div>

      {adding ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">New issue</CardTitle>
            <CardDescription>
              Record a possible issue. Not a legal conclusion — just something worth
              flagging for review.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createIssue} className="space-y-4">
              <div>
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="mt-1 flex h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm"
                >
                  {ISSUE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="headline">Headline</Label>
                <Input
                  id="headline"
                  required
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="detail">Detail</Label>
                <Textarea
                  id="detail"
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  rows={4}
                  className="mt-1"
                />
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
                    {["confirmed", "likely", "unclear"].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="next">Next step</Label>
                  <Input
                    id="next"
                    value={nextStep}
                    onChange={(e) => setNextStep(e.target.value)}
                    placeholder="e.g. Serve Stage 2 formal notice"
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label>Link evidence</Label>
                <ul className="mt-1 max-h-40 overflow-y-auto divide-y divide-neutral-100 rounded-lg border border-neutral-200">
                  {evidence.length === 0 ? (
                    <li className="p-3 text-sm text-neutral-500">No evidence.</li>
                  ) : (
                    evidence.map((e) => (
                      <li key={e.id} className="p-2 flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={linked.has(e.id)}
                          onChange={() => {
                            const next = new Set(linked);
                            if (next.has(e.id)) next.delete(e.id);
                            else next.add(e.id);
                            setLinked(next);
                          }}
                          className="mt-1"
                        />
                        <div>
                          <p>{e.description ?? "(no description)"}</p>
                          <p className="text-xs text-neutral-500">
                            {e.occurred_at?.slice(0, 10) ?? "undated"}
                          </p>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save issue"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {issues.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-neutral-500">
            No issues raised yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {issues.map((it) => (
            <Card key={it.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{it.headline}</CardTitle>
                    <CardDescription className="mt-1">
                      {(it.issue_type ?? "").replace(/_/g, " ")} · {formatDate(it.created_at)}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={it.status === "open" ? "warning" : "secondary"}>
                      {it.status}
                    </Badge>
                    <Badge
                      variant={
                        it.confidence === "confirmed"
                          ? "success"
                          : it.confidence === "likely"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {it.confidence}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              {it.detail ? (
                <CardContent className="space-y-2">
                  <p className="text-sm text-neutral-800 whitespace-pre-wrap">
                    {it.detail}
                  </p>
                  {it.next_step ? (
                    <p className="text-xs text-neutral-500">
                      <strong>Next:</strong> {it.next_step}
                    </p>
                  ) : null}
                  {it.related_evidence_ids?.length ? (
                    <p className="text-xs text-neutral-500">
                      {it.related_evidence_ids.length} linked evidence item
                      {it.related_evidence_ids.length > 1 ? "s" : ""}
                    </p>
                  ) : null}
                </CardContent>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
