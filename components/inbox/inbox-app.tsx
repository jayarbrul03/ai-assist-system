"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime, daysUntil, cn } from "@/lib/utils";
import { stageLabel } from "@/lib/comms";
import {
  INBOX_LABEL_PRESETS,
  countQueue,
  matchesSidebarQueue,
  type SidebarQueue,
} from "@/lib/inbox/presets";
import type { InboxTriage } from "@/lib/claude/inbox-summaries";
import {
  FileText,
  Send,
  Sparkles,
  Filter,
  Loader2,
  LayoutList,
  CalendarDays,
  Tag,
  PenLine,
} from "lucide-react";

export type InboxListRow =
  | {
      kind: "comms";
      id: string;
      sortAt: string;
      subject: string | null;
      to_party: string | null;
      status: string;
      stage: string;
      from_user: string;
      response_deadline: string | null;
      inbox_labels: string[];
    }
  | {
      kind: "records";
      id: string;
      sortAt: string;
      status: string;
      request_type: string[];
      submitted_at: string | null;
      statutory_deadline: string | null;
    };

const FOLDER = { all: "all", comms: "comms", records: "records" } as const;
type Folder = (typeof FOLDER)[keyof typeof FOLDER];

const TRIAGE_FILTER = ["all", "urgent", "standard", "info"] as const;
type TriageFilter = (typeof TRIAGE_FILTER)[number];

/** Shared styles for filter `<select>` — full width on narrow screens, touch-friendly height. */
const filterSelectClass =
  "min-h-11 w-full rounded-md border border-neutral-300 bg-white px-3 text-base sm:h-9 sm:min-h-0 sm:text-sm";

const filterLabelClass = "text-xs font-medium text-neutral-500";

function triageClass(t: InboxTriage): string {
  if (t === "urgent") return "bg-amber-100 text-amber-900 border-amber-200";
  if (t === "info") return "bg-slate-100 text-slate-800 border-slate-200";
  return "bg-neutral-100 text-neutral-800 border-neutral-200";
}

function toCountRows(
  rows: InboxListRow[],
): Array<{
  kind: "comms" | "records";
  status: string;
  response_deadline: string | null;
  statutory_deadline: string | null;
  submitted_at: string | null;
}> {
  return rows.map((r) => {
    if (r.kind === "comms") {
      return {
        kind: "comms" as const,
        status: r.status,
        response_deadline: r.response_deadline,
        statutory_deadline: null,
        submitted_at: null,
      };
    }
    return {
      kind: "records" as const,
      status: r.status,
      response_deadline: null,
      statutory_deadline: r.statutory_deadline,
      submitted_at: r.submitted_at,
    };
  });
}

export function InboxApp({ rows: initialRows }: { rows: InboxListRow[] }) {
  const [rows, setRows] = useState(initialRows);
  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const [folder, setFolder] = useState<Folder>(FOLDER.all);
  const [sidebarQueue, setSidebarQueue] = useState<SidebarQueue>("all");
  const [toParty, setToParty] = useState<"all" | "committee" | "manager">("all");
  const [commsStatus, setCommsStatus] = useState("all");
  const [recordsStatus, setRecordsStatus] = useState("all");
  const [labelFilter, setLabelFilter] = useState("all");
  const [triageFilter, setTriageFilter] = useState<TriageFilter>("all");
  const [viewMode, setViewMode] = useState<"list" | "timeline">("list");
  const [summaries, setSummaries] = useState<
    Record<string, { summary: string; triage: InboxTriage }>
  >({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const summariesRef = useRef(summaries);
  summariesRef.current = summaries;

  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [draftLoading, setDraftLoading] = useState(false);
  const [labelEditId, setLabelEditId] = useState<string | null>(null);
  const [savingLabels, setSavingLabels] = useState(false);

  const countBase = useMemo(() => toCountRows(rows), [rows]);
  const qCounts = useMemo(
    () => ({
      all: countBase.length,
      intake: countQueue("intake", countBase),
      urgent: countQueue("urgent", countBase),
      working: countQueue("working", countBase),
      closed: countQueue("closed", countBase),
    }),
    [countBase],
  );

  const commRows = useMemo(() => rows.filter((r) => r.kind === "comms"), [rows]);
  const recRows = useMemo(() => rows.filter((r) => r.kind === "records"), [rows]);

  const allLabels = useMemo(() => {
    const s = new Set<string>();
    for (const r of commRows) {
      for (const l of r.inbox_labels ?? []) s.add(l);
    }
    return Array.from(s).sort();
  }, [commRows]);

  const filtered = useMemo(() => {
    let list: InboxListRow[] = rows;
    if (folder === "comms") list = commRows;
    if (folder === "records") list = recRows;

    return list.filter((row) => {
      if (row.kind === "comms") {
        if (
          !matchesSidebarQueue(
            sidebarQueue,
            "comms",
            row.status,
            row.response_deadline,
            null,
            null,
          )
        ) {
          return false;
        }
        if (toParty !== "all" && row.to_party !== toParty) return false;
        if (commsStatus !== "all" && row.status !== commsStatus) return false;
        if (labelFilter !== "all" && !row.inbox_labels?.includes(labelFilter)) {
          return false;
        }
        if (triageFilter !== "all") {
          const t = summaries[row.id]?.triage;
          if (t === undefined) return true;
          if (t !== triageFilter) return false;
        }
        return true;
      }
      if (row.kind === "records") {
        if (
          !matchesSidebarQueue(
            sidebarQueue,
            "records",
            row.status,
            null,
            row.statutory_deadline,
            row.submitted_at,
          )
        ) {
          return false;
        }
        if (recordsStatus !== "all" && row.status !== recordsStatus) return false;
        return true;
      }
      return true;
    });
  }, [
    rows,
    folder,
    commRows,
    recRows,
    sidebarQueue,
    toParty,
    commsStatus,
    recordsStatus,
    labelFilter,
    triageFilter,
    summaries,
  ]);

  const commIdsForAi = useMemo(() => {
    return filtered
      .filter((r): r is Extract<InboxListRow, { kind: "comms" }> => r.kind === "comms")
      .map((r) => r.id)
      .slice(0, 15);
  }, [filtered]);

  useEffect(() => {
    if (commIdsForAi.length === 0) {
      return;
    }
    const missing = commIdsForAi.filter((id) => !summariesRef.current[id]);
    if (missing.length === 0) {
      setAiLoading(false);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      (async () => {
        setAiLoading(true);
        setAiError(null);
        try {
          const res = await fetch("/api/inbox/summaries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ communicationIds: missing }),
          });
          const j = (await res.json()) as {
            error?: string;
            items?: Array<{ id: string; summary: string; triage: InboxTriage }>;
          };
          if (cancelled) return;
          if (!res.ok) {
            setAiError(j.error ?? "AI summary failed");
            return;
          }
          const next: Record<string, { summary: string; triage: InboxTriage }> = {};
          for (const it of j.items ?? []) {
            next[it.id] = { summary: it.summary, triage: it.triage };
          }
          setSummaries((prev) => ({ ...prev, ...next }));
        } catch (e) {
          if (!cancelled) {
            setAiError(e instanceof Error ? e.message : "Request failed");
          }
        } finally {
          if (!cancelled) {
            setAiLoading(false);
          }
        }
      })();
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [commIdsForAi.join(",")]);

  async function saveLabels(commId: string, next: string[]) {
    setSavingLabels(true);
    try {
      const res = await fetch("/api/inbox/labels", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communicationId: commId, labels: next }),
      });
      const j = (await res.json()) as { error?: string; labels?: string[] };
      if (!res.ok) {
        setAiError(j.error ?? "Could not save labels (run DB migration for inbox_labels?)");
        return;
      }
      setRows((prev) =>
        prev.map((r) =>
          r.kind === "comms" && r.id === commId
            ? { ...r, inbox_labels: j.labels ?? next }
            : r,
        ),
      );
      setLabelEditId(null);
    } finally {
      setSavingLabels(false);
    }
  }

  async function runDraft(commId: string) {
    setDraftId(commId);
    setDraftLoading(true);
    setDraftSubject("");
    setDraftBody("");
    try {
      const res = await fetch("/api/inbox/draft-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communicationId: commId }),
      });
      const j = (await res.json()) as { error?: string; subject?: string; body?: string };
      if (!res.ok) {
        setAiError(j.error ?? "Draft failed");
        setDraftId(null);
        return;
      }
      setDraftSubject(j.subject ?? "");
      setDraftBody(j.body ?? "");
    } finally {
      setDraftLoading(false);
    }
  }

  const timelineGroups = useMemo(() => {
    const map = new Map<string, InboxListRow[]>();
    for (const r of filtered) {
      const day = r.sortAt.slice(0, 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(r);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 min-w-0 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)] lg:items-start">
        <nav className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 px-1 mb-2 sm:mb-1.5">
            Queues
          </p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-1 sm:gap-1">
            {(
              [
                { q: "all" as const, label: "All" },
                { q: "intake" as const, label: "Intake" },
                { q: "urgent" as const, label: "Urgent" },
                { q: "working" as const, label: "Working" },
                { q: "closed" as const, label: "Closed" },
              ] as const
            ).map(({ q, label }) => (
              <Button
                key={q}
                type="button"
                variant={sidebarQueue === q ? "default" : "ghost"}
                className="h-10 w-full min-h-11 justify-between sm:h-9 sm:min-h-0"
                onClick={() => setSidebarQueue(q)}
              >
                <span>{label}</span>
                <span className="text-xs tabular-nums opacity-80">{qCounts[q]}</span>
              </Button>
            ))}
          </div>
        </nav>

        <div className="space-y-4 min-w-0">
          <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm sm:p-4 sm:gap-3.5">
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-800">
              <Filter className="h-4 w-4 shrink-0" aria-hidden />
              Folders &amp; filters
            </div>
            <div className="grid grid-cols-1 min-[360px]:grid-cols-3 gap-2">
              {(
                [
                  { k: FOLDER.all, label: "All" },
                  { k: FOLDER.comms, label: "Communications" },
                  { k: FOLDER.records, label: "Records" },
                ] as const
              ).map((x) => (
                <Button
                  key={x.k}
                  type="button"
                  size="sm"
                  variant={folder === x.k ? "default" : "outline"}
                  className="min-h-10 w-full sm:min-h-0"
                  onClick={() => setFolder(x.k)}
                >
                  {x.label}
                </Button>
              ))}
            </div>
            {(folder === "all" || folder === "comms") && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 sm:gap-3 text-sm">
                <label className="flex flex-col gap-1.5 min-w-0">
                  <span className={filterLabelClass}>To</span>
                  <select
                    className={filterSelectClass}
                    value={toParty}
                    onChange={(e) =>
                      setToParty(e.target.value as "all" | "committee" | "manager")
                    }
                  >
                    <option value="all">All</option>
                    <option value="committee">Committee</option>
                    <option value="manager">Manager</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 min-w-0">
                  <span className={filterLabelClass}>Status</span>
                  <select
                    className={filterSelectClass}
                    value={commsStatus}
                    onChange={(e) => setCommsStatus(e.target.value)}
                  >
                    {["all", "draft", "served", "acknowledged", "responded", "resolved", "escalated"].map(
                      (s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5 min-w-0 sm:col-span-2 xl:col-span-1">
                  <span className={cn(filterLabelClass, "inline-flex items-center gap-1")}>
                    <Tag className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Label
                  </span>
                  <select
                    className={filterSelectClass}
                    value={labelFilter}
                    onChange={(e) => setLabelFilter(e.target.value)}
                  >
                    <option value="all">Any</option>
                    {allLabels.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            {folder === "all" || folder === "records" ? (
              <div className="grid grid-cols-1 sm:max-w-sm gap-1.5 text-sm">
                <label className="flex flex-col gap-1.5 min-w-0">
                  <span className={filterLabelClass}>Records status</span>
                  <select
                    className={filterSelectClass}
                    value={recordsStatus}
                    onChange={(e) => setRecordsStatus(e.target.value)}
                  >
                    {["all", "draft", "submitted", "fulfilled"].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}
            {folder !== "records" && Object.keys(summaries).length > 0 && (
              <div className="flex flex-col gap-1.5 sm:gap-2 min-w-0">
                <span className={filterLabelClass}>AI triage</span>
                <div className="-mx-0.5 flex min-h-11 max-w-full flex-nowrap items-stretch gap-1 overflow-x-auto overflow-y-hidden pb-0.5 [scrollbar-gutter:stable] sm:mx-0 sm:min-h-0 sm:flex-wrap sm:items-center sm:pb-0">
                  {TRIAGE_FILTER.map((t) => (
                    <Button
                      key={t}
                      type="button"
                      size="sm"
                      variant={triageFilter === t ? "secondary" : "ghost"}
                      className="min-h-11 shrink-0 px-3 first:ml-0.5 last:mr-0.5 sm:min-h-0 sm:shrink sm:px-3"
                      onClick={() => setTriageFilter(t)}
                    >
                      {t}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2.5 border-t border-neutral-100 pt-3 sm:flex-row sm:flex-wrap sm:items-stretch sm:gap-2">
              <span className={cn(filterLabelClass, "pt-0.5 sm:shrink-0")}>View</span>
              <div className="grid grid-cols-2 gap-2 sm:inline-flex sm:flex-1 sm:items-center sm:gap-1 sm:justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  className="min-h-11 w-full justify-center sm:min-h-0 sm:w-auto"
                  onClick={() => setViewMode("list")}
                >
                  <LayoutList className="h-4 w-4 mr-1" aria-hidden />
                  List
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={viewMode === "timeline" ? "secondary" : "ghost"}
                  className="min-h-11 w-full justify-center sm:min-h-0 sm:w-auto"
                  onClick={() => setViewMode("timeline")}
                >
                  <CalendarDays className="h-4 w-4 mr-1" aria-hidden />
                  By day
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 text-sm text-teal-900 sm:flex-row sm:items-start sm:gap-2">
            <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              <strong>AI</strong> loads summaries for the first 15 communications in the filtered
              list. <strong>AI draft</strong> = suggested reply to copy to your own email.{" "}
              <Link href="/chat" className="underline">
                The Brain
              </Link>{" "}
              = by-law Q&amp;A.{" "}
              <Link href="/ai" className="underline">
                Parity AI scope &amp; limits
              </Link>
              .
            </p>
            {aiLoading ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : null}
          </div>
          {aiError ? <p className="text-sm text-amber-800">{aiError}</p> : null}
        </div>
      </div>

      {draftId && (
        <div
          className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/45 p-2 sm:items-center sm:p-4"
          onClick={() => {
            if (!draftLoading) setDraftId(null);
          }}
        >
          <Card
            className="my-auto w-full max-w-2xl max-h-[85dvh] overflow-y-auto shadow-xl sm:max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle className="text-lg">Draft reply (copy only)</CardTitle>
              <CardDescription>Parity does not send this email for you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {draftLoading ? (
                <p className="text-sm text-neutral-500">Generating…</p>
              ) : (
                <>
                  <p className="text-xs text-neutral-500">Subject</p>
                  <Textarea
                    value={draftSubject}
                    onChange={(e) => setDraftSubject(e.target.value)}
                    rows={2}
                  />
                  <p className="text-xs text-neutral-500">Body</p>
                  <Textarea
                    value={draftBody}
                    onChange={(e) => setDraftBody(e.target.value)}
                    rows={12}
                    className="font-mono text-sm"
                  />
                </>
              )}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  className="min-h-11 w-full sm:min-h-0 sm:w-auto"
                  variant="outline"
                  onClick={() => {
                    if (typeof navigator !== "undefined" && draftBody) {
                      void navigator.clipboard.writeText(
                        `Subject: ${draftSubject}\n\n${draftBody}`,
                      );
                    }
                  }}
                >
                  Copy all
                </Button>
                <Button
                  type="button"
                  className="min-h-11 w-full sm:min-h-0 sm:w-auto"
                  onClick={() => setDraftId(null)}
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {labelEditId && (
        <div
          className="fixed inset-0 z-40 flex items-stretch justify-center bg-black/30 p-2 sm:items-center sm:p-4"
          onClick={() => setLabelEditId(null)}
        >
          <Card
            className="my-auto w-full max-h-[85dvh] max-w-md overflow-y-auto sm:max-h-none"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle className="text-base">Labels</CardTitle>
              <CardDescription>Tag this item for your team.</CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const row = rows.find(
                  (r) => r.kind === "comms" && r.id === labelEditId,
                ) as Extract<InboxListRow, { kind: "comms" }> | undefined;
                if (!row) return null;
                return (
                  <LabelPicker
                    key={row.id}
                    initial={row.inbox_labels}
                    onSave={(lab) => void saveLabels(row.id, lab)}
                    onCancel={() => setLabelEditId(null)}
                    saving={savingLabels}
                  />
                );
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Inbox &amp; feed</CardTitle>
          <CardDescription>
            {filtered.length} item{filtered.length === 1 ? "" : "s"} in this view
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-neutral-500">No items match. Try another queue or folder.</p>
          ) : viewMode === "list" ? (
            <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-100 bg-white">
              {filtered.map((row) => (
                <InboxRow
                  key={row.kind + row.id}
                  row={row}
                  summaries={summaries}
                  aiLoading={aiLoading}
                  commIdsForAi={commIdsForAi}
                  onLabelOpen={(id) => setLabelEditId(id)}
                  onDraft={runDraft}
                />
              ))}
            </ul>
          ) : (
            <div className="space-y-6">
              {timelineGroups.map(([day, list]) => (
                <div key={day}>
                  <p className="text-xs font-medium text-neutral-500 mb-2 px-1">{day}</p>
                  <ul className="divide-y divide-neutral-200 border border-neutral-100 rounded-lg bg-white">
                    {list.map((row) => (
                      <InboxRow
                        key={row.kind + row.id}
                        row={row}
                        summaries={summaries}
                        aiLoading={aiLoading}
                        commIdsForAi={commIdsForAi}
                        onLabelOpen={(id) => setLabelEditId(id)}
                        onDraft={runDraft}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LabelPicker({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: string[];
  onSave: (l: string[]) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [sel, setSel] = useState(() => new Set(initial));
  const [custom, setCustom] = useState("");
  function toggle(v: string) {
    setSel((prev) => {
      const n = new Set(prev);
      if (n.has(v)) n.delete(v);
      else n.add(v);
      return n;
    });
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {INBOX_LABEL_PRESETS.map((p) => (
          <Button
            key={p.value}
            type="button"
            size="sm"
            variant={sel.has(p.value) ? "default" : "outline"}
            className="min-h-10 sm:min-h-0"
            onClick={() => toggle(p.value)}
          >
            {p.label}
          </Button>
        ))}
      </div>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch">
        <input
          className="h-11 min-w-0 flex-1 rounded-md border border-neutral-300 px-3 text-base sm:h-9 sm:px-2 sm:text-sm"
          placeholder="Custom label"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="min-h-11 shrink-0 sm:min-h-0"
          onClick={() => {
            if (!custom.trim()) return;
            const v = custom
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9-_\s]/g, "")
              .replace(/\s+/g, "-")
              .slice(0, 32);
            if (v) {
              setSel((prev) => new Set([...prev, v]));
            }
            setCustom("");
          }}
        >
          Add
        </Button>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          className="min-h-11 w-full sm:min-h-0 sm:w-auto"
          variant="ghost"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          type="button"
          className="min-h-11 w-full sm:min-h-0 sm:w-auto"
          onClick={() => onSave(Array.from(sel))}
          disabled={saving}
        >
          {saving ? "…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

function InboxRow({
  row,
  summaries,
  aiLoading,
  commIdsForAi,
  onLabelOpen,
  onDraft,
}: {
  row: InboxListRow;
  summaries: Record<string, { summary: string; triage: InboxTriage }>;
  aiLoading: boolean;
  commIdsForAi: string[];
  onLabelOpen: (id: string) => void;
  onDraft: (id: string) => void;
}) {
  if (row.kind === "comms") {
    const d = daysUntil(row.response_deadline);
    const s = summaries[row.id];
    return (
      <li className="hover:bg-neutral-50/80 px-3 py-4">
        <div className="flex flex-col gap-3">
          {/* Title row: subject + status (status stacks below on very narrow if needed) */}
          <div className="flex flex-col gap-2 min-[400px]:flex-row min-[400px]:items-start min-[400px]:justify-between min-[400px]:gap-3">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <Send
                className="mt-0.5 h-4 w-4 shrink-0 text-teal-600"
                aria-hidden
              />
              <p className="min-w-0 flex-1 text-base font-medium leading-snug text-neutral-900 [overflow-wrap:anywhere] sm:text-[0.95rem]">
                {row.subject || "(no subject)"}
              </p>
            </div>
            <Badge
              className="w-fit min-[400px]:shrink-0"
              variant={row.status === "resolved" ? "success" : "default"}
            >
              {row.status}
            </Badge>
          </div>

          {/* Tags: wrap, touch-friendly label control */}
          <div className="flex flex-wrap gap-1.5 items-center pl-6 [word-break:break-word]">
            <Badge variant="outline">To {row.to_party}</Badge>
            <Badge variant="secondary">{stageLabel(row.stage)}</Badge>
            {s && (
              <Badge className={cn("border", triageClass(s.triage))} variant="outline">
                {s.triage}
              </Badge>
            )}
            {(row.inbox_labels ?? []).map((l) => (
              <Badge key={l} variant="outline" className="text-[10px]">
                {l}
              </Badge>
            ))}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-9 min-h-9 min-w-9 px-2 sm:h-7 sm:min-h-0 sm:min-w-0"
              aria-label="Edit labels"
              onClick={() => onLabelOpen(row.id)}
            >
              <Tag className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Summary + actions: stack on small screens; actions get full-width tap targets on narrow viewports */}
          <div className="flex flex-col gap-3 sm:gap-3 lg:flex-row lg:items-start lg:gap-4">
            <div className="min-w-0 flex-1">
              {s && (
                <p className="border-l-2 border-teal-300 pl-3 text-sm leading-relaxed text-neutral-700 sm:pl-4">
                  {s.summary}
                </p>
              )}
              {!s && commIdsForAi.includes(row.id) && aiLoading ? (
                <p className="pl-3 text-xs text-neutral-400 sm:pl-4">Summarising…</p>
              ) : null}
            </div>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:justify-end lg:max-w-[11rem] lg:flex-col lg:justify-start lg:gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="min-h-11 w-full justify-center sm:min-h-8 sm:w-auto"
                onClick={() => onDraft(row.id)}
              >
                <PenLine className="mr-1 h-3.5 w-3.5" />
                AI draft
              </Button>
              <Link
                href={`/communications/${row.id}`}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-md text-sm font-medium text-teal-700 underline ring-offset-2 transition-colors hover:bg-teal-50/80 sm:min-h-0 sm:w-auto sm:justify-end sm:px-2 sm:py-1.5"
              >
                Open
              </Link>
            </div>
          </div>

          <p className="text-xs text-neutral-500">
            {formatDateTime(row.sortAt)}
            {row.status === "served" && d !== null ? (
              <span className="ml-2 max-sm:block max-sm:ml-0 sm:inline">
                · Response{" "}
                {d < 0 ? `${Math.abs(d)}d overdue` : `${d}d left`}
              </span>
            ) : null}
          </p>
        </div>
      </li>
    );
  }
  const d = daysUntil(row.statutory_deadline);
  return (
    <li className="hover:bg-neutral-50/80 px-3 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden />
            <div className="min-w-0">
              <p className="font-medium leading-snug text-neutral-900 [overflow-wrap:anywhere]">
                Records request
              </p>
              <p className="mt-0.5 text-xs text-neutral-500 [overflow-wrap:anywhere]">
                {row.request_type?.join(", ") || "—"}
              </p>
            </div>
          </div>
          <p className="mt-1.5 text-xs text-neutral-500">
            {formatDateTime(row.sortAt)}
            {d !== null && row.submitted_at ? (
              <span className="ml-2 max-sm:block max-sm:ml-0 sm:inline">
                · Statutory {d < 0 ? "overdue" : `${d}d left`}
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:shrink-0 sm:flex-row sm:items-center sm:justify-end">
          <Badge variant="secondary">{row.status}</Badge>
          <Link
            href={`/records/${row.id}`}
            className="inline-flex min-h-11 items-center justify-center rounded-md text-sm font-medium text-teal-700 underline ring-offset-2 hover:bg-teal-50/80 sm:min-h-0 sm:justify-end sm:px-2 sm:py-1.5"
          >
            Open
          </Link>
        </div>
      </div>
    </li>
  );
}
