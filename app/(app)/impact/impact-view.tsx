"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
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
} from "@/components/ui/card";

interface Entry {
  id: string;
  log_date: string;
  anxiety_score: number | null;
  disturbance_score: number | null;
  bc_contact_occurred: boolean;
  monitoring_observed: boolean;
  signage_or_towing_pressure: boolean;
  family_anxiety: boolean;
  avoidance_of_premises: boolean;
  new_public_content: boolean;
  new_evidence_captured: boolean;
  summary: string | null;
  legal_relevance: string | null;
}

const CHECK_FIELDS: Array<{ key: keyof Entry; label: string }> = [
  { key: "bc_contact_occurred", label: "Body corp contact occurred" },
  { key: "monitoring_observed", label: "Monitoring observed" },
  { key: "signage_or_towing_pressure", label: "Signage / towing pressure" },
  { key: "family_anxiety", label: "Family anxiety" },
  { key: "avoidance_of_premises", label: "Avoidance of premises" },
  { key: "new_public_content", label: "New public content" },
  { key: "new_evidence_captured", label: "New evidence captured" },
];

export function ImpactLogView({
  schemeId,
  entries,
}: {
  schemeId: string;
  entries: Entry[];
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const todayEntry = entries.find((e) => e.log_date === today);

  const [date, setDate] = useState(todayEntry?.log_date ?? today);
  const [anxiety, setAnxiety] = useState<number>(todayEntry?.anxiety_score ?? 0);
  const [disturbance, setDisturbance] = useState<number>(
    todayEntry?.disturbance_score ?? 0,
  );
  const [flags, setFlags] = useState<Record<string, boolean>>(() =>
    CHECK_FIELDS.reduce(
      (acc, f) => ({
        ...acc,
        [f.key]: todayEntry ? !!todayEntry[f.key] : false,
      }),
      {},
    ),
  );
  const [summary, setSummary] = useState<string>(todayEntry?.summary ?? "");
  const [relevance, setRelevance] = useState<string>(
    todayEntry?.legal_relevance ?? "low",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chartData = useMemo(() => {
    return [...entries]
      .sort((a, b) => a.log_date.localeCompare(b.log_date))
      .slice(-30)
      .map((e) => ({
        date: e.log_date.slice(5),
        anxiety: e.anxiety_score ?? 0,
        disturbance: e.disturbance_score ?? 0,
      }));
  }, [entries]);

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

    const payload = {
      user_id: user.id,
      scheme_id: schemeId,
      log_date: date,
      anxiety_score: anxiety,
      disturbance_score: disturbance,
      ...flags,
      summary: summary || null,
      legal_relevance: relevance,
    };

    const { error: upErr } = await supabase
      .from("impact_entries")
      .upsert(payload, { onConflict: "user_id,scheme_id,log_date" });

    if (upErr) {
      setError(upErr.message);
      setSaving(false);
      return;
    }

    await supabase.from("audit_log").insert({
      user_id: user.id,
      scheme_id: schemeId,
      action: "impact_logged",
      entity_type: "impact_entries",
      metadata: { log_date: date, anxiety, disturbance },
    });

    setSaving(false);
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daily check-in</CardTitle>
          <CardDescription>Takes 30 seconds. Your log is private.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Anxiety: {anxiety}/10</Label>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={anxiety}
                  onChange={(e) => setAnxiety(Number(e.target.value))}
                  className="mt-2 w-full"
                />
              </div>
              <div>
                <Label>Disturbance: {disturbance}/10</Label>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={disturbance}
                  onChange={(e) => setDisturbance(Number(e.target.value))}
                  className="mt-2 w-full"
                />
              </div>
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-neutral-800 mb-1">
                What happened today?
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {CHECK_FIELDS.map((f) => (
                  <label
                    key={f.key as string}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={!!flags[f.key as string]}
                      onChange={(e) =>
                        setFlags({ ...flags, [f.key as string]: e.target.checked })
                      }
                    />
                    {f.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <Label htmlFor="summary">Short summary</Label>
              <Textarea
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="rel">Legal relevance</Label>
              <select
                id="rel"
                value={relevance}
                onChange={(e) => setRelevance(e.target.value)}
                className="mt-1 flex h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Saving…" : todayEntry ? "Update entry" : "Save entry"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">30-day trend</CardTitle>
          <CardDescription>Anxiety (amber) · Disturbance (red)</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-neutral-500 py-16 text-center">
              No entries yet. Your trend appears after a few days of logs.
            </p>
          ) : (
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="anxiety"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="disturbance"
                    stroke="#dc2626"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Recent entries</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-sm text-neutral-500">No entries yet.</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {entries.slice(0, 14).map((e) => (
                <li key={e.id} className="py-3 flex items-center gap-4">
                  <div className="w-24 text-sm text-neutral-600">{e.log_date}</div>
                  <div className="flex gap-3 text-xs">
                    <span>A: {e.anxiety_score ?? 0}</span>
                    <span>D: {e.disturbance_score ?? 0}</span>
                  </div>
                  <p className="text-sm text-neutral-700 flex-1 truncate">
                    {e.summary || "—"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
