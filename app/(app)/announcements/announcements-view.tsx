"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { LegalLodgementWarning } from "@/components/ui/legal-warning";
import { Megaphone, Pin, Plus } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface Announcement {
  id: string;
  title: string;
  body: string;
  tone: string;
  pinned: boolean;
  published_at: string;
  posted_by: string | null;
}

const TONES = [
  { value: "positive", label: "Positive" },
  { value: "info", label: "Info" },
  { value: "meeting", label: "Meeting" },
  { value: "reminder", label: "Reminder" },
  { value: "urgent", label: "Urgent" },
] as const;

export function AnnouncementsView({
  schemeId,
  canPublish,
  initial,
}: {
  schemeId: string;
  canPublish: boolean;
  initial: Announcement[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<Announcement[]>(initial);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tone, setTone] = useState<string>("info");
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schemeId, title, body, tone, pinned }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const j = await res.json();
      setItems([j.announcement, ...items]);
      setTitle("");
      setBody("");
      setTone("info");
      setPinned(false);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {canPublish ? (
        <div className="flex justify-end">
          <Button onClick={() => setOpen(!open)} size="sm">
            <Plus className="h-4 w-4" /> {open ? "Cancel" : "New announcement"}
          </Button>
        </div>
      ) : null}

      {open && canPublish ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Publish announcement</CardTitle>
            <CardDescription>
              Appears on every scheme member&apos;s dashboard. In-app only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={publish} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="mt-1"
                  placeholder="AGM date set — 12 May 2026"
                />
              </div>
              <div>
                <Label htmlFor="body">Body</Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={6}
                  required
                  className="mt-1"
                  placeholder="Short, friendly, factual. Cite a by-law if enforcing."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="tone">Tone</Label>
                  <select
                    id="tone"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="mt-1 flex h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-sm"
                  >
                    {TONES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    id="pinned"
                    type="checkbox"
                    checked={pinned}
                    onChange={(e) => setPinned(e.target.checked)}
                  />
                  <Label htmlFor="pinned" className="mb-0">
                    Pin to top
                  </Label>
                </div>
              </div>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
            </form>
          </CardContent>
          <CardFooter className="gap-2">
            <Button onClick={publish} disabled={busy || !title.trim() || !body.trim()}>
              {busy ? "Publishing…" : "Publish"}
            </Button>
          </CardFooter>
        </Card>
      ) : null}

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-neutral-500">
            {canPublish
              ? "No announcements yet. Post one above."
              : "No announcements yet. Your committee or manager hasn't posted anything."}
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <li key={a.id}>
              <Card className={a.pinned ? "border-teal-300 bg-teal-50/40" : undefined}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <Megaphone className="h-4 w-4 text-teal-700 mt-1" />
                      <div>
                        <CardTitle className="text-base">{a.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {formatDateTime(a.published_at)}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {a.pinned ? (
                        <Badge variant="default" className="gap-1">
                          <Pin className="h-3 w-3" /> Pinned
                        </Badge>
                      ) : null}
                      <Badge
                        variant={
                          a.tone === "urgent"
                            ? "danger"
                            : a.tone === "positive"
                            ? "success"
                            : a.tone === "reminder"
                            ? "warning"
                            : "secondary"
                        }
                      >
                        {a.tone}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed">
                    {a.body}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <LegalLodgementWarning compact />
    </div>
  );
}
