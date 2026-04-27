"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { CommsStatus } from "@/lib/supabase/types";

const actions: { label: string; next: CommsStatus }[] = [
  { label: "Mark acknowledged", next: "acknowledged" },
  { label: "Mark responded", next: "responded" },
  { label: "Mark resolved", next: "resolved" },
  { label: "Mark escalated", next: "escalated" },
];

export function LeadershipStatusActions({
  communicationId,
  currentStatus,
}: {
  communicationId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (currentStatus === "draft") {
    return null;
  }
  if (currentStatus === "resolved") {
    return <p className="text-sm text-neutral-500">Marked resolved in Parity.</p>;
  }

  async function go(next: CommsStatus) {
    setErr(null);
    setPending(next);
    try {
      const res = await fetch("/api/communications/leadership-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communicationId, nextStatus: next }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setErr(j.error ?? "Update failed");
        return;
      }
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-neutral-800">Inbox workflow (leadership)</p>
      <p className="text-xs text-neutral-500">
        Updates the record in Parity only (not an email send). Contact the sender or use your usual
        channels as needed.
      </p>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <Button
            key={a.next}
            type="button"
            variant="outline"
            size="sm"
            disabled={pending !== null}
            onClick={() => go(a.next)}
          >
            {pending === a.next ? "…" : a.label}
          </Button>
        ))}
      </div>
      {err ? <p className="text-sm text-red-600">{err}</p> : null}
    </div>
  );
}
