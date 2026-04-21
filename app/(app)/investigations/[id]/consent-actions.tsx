"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function ConsentActions({ investigationId }: { investigationId: string }) {
  const router = useRouter();
  const [showRedact, setShowRedact] = useState(false);
  const [redactionNotes, setRedactionNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function respond(kind: "released" | "released_redacted" | "refused") {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/investigations/${investigationId}/consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response: kind,
          redactionNotes: kind === "released_redacted" ? redactionNotes : undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save decision");
    } finally {
      setBusy(false);
    }
  }

  if (showRedact) {
    return (
      <div className="space-y-3">
        <Label htmlFor="redact">
          What would you like redacted? (optional, not shown to requester)
        </Label>
        <Textarea
          id="redact"
          rows={3}
          value={redactionNotes}
          onChange={(e) => setRedactionNotes(e.target.value)}
          placeholder="e.g. Remove my phone number. Exclude photos of my unit interior."
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex gap-2">
          <Button onClick={() => respond("released_redacted")} disabled={busy}>
            Release with redactions
          </Button>
          <Button variant="outline" onClick={() => setShowRedact(false)}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => respond("released")} disabled={busy}>
        Release
      </Button>
      <Button variant="outline" onClick={() => setShowRedact(true)} disabled={busy}>
        Release redacted
      </Button>
      <Button variant="outline" onClick={() => respond("refused")} disabled={busy}>
        Refuse
      </Button>
      {error ? <p className="text-sm text-red-600 w-full">{error}</p> : null}
    </div>
  );
}
