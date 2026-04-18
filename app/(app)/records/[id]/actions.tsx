"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function MarkFulfilled({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fulfil(partial: boolean) {
    setBusy(true);
    const supabase = createClient();
    const { error: upErr } = await supabase
      .from("records_requests")
      .update({
        fulfilled_at: new Date().toISOString(),
        fulfilled_partial: partial,
        status: "fulfilled",
      })
      .eq("id", id);
    if (upErr) {
      setError(upErr.message);
      setBusy(false);
      return;
    }
    await supabase.from("audit_log").insert({
      action: "records_fulfilled",
      entity_type: "records_requests",
      entity_id: id,
      metadata: { partial },
    });
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Mark as fulfilled</CardTitle>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Button onClick={() => fulfil(false)} disabled={busy}>
          Fully fulfilled
        </Button>
        <Button variant="outline" onClick={() => fulfil(true)} disabled={busy}>
          Partial
        </Button>
        {error ? <p className="text-sm text-red-600 ml-2">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
