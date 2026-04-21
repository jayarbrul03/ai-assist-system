"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

const SUGGESTIONS_LOADED = [
  "Do I have to reverse park?",
  "Can my visitor be towed after 48 hours?",
  "What records am I entitled to see?",
  "Can the committee change a rule by email?",
];

const SUGGESTIONS_EMPTY = [
  "What does a body corporate do?",
  "How does the BCCM Act work?",
  "Can I attend committee meetings as a lot owner?",
  "What is a Form 10 Contravention Notice?",
];

export function QuickAsk({
  schemeId: _schemeId,
  bylawsLoaded,
}: {
  schemeId: string;
  bylawsLoaded: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const suggestions = bylawsLoaded ? SUGGESTIONS_LOADED : SUGGESTIONS_EMPTY;

  function ask(text: string) {
    if (!text.trim()) return;
    setBusy(true);
    const url = `/chat?q=${encodeURIComponent(text)}`;
    router.push(url);
  }

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
        className="flex gap-2"
      >
        <Input
          placeholder={
            bylawsLoaded
              ? "Ask about a by-law, procedure, or situation…"
              : "Ask anything about Queensland body corporate rules…"
          }
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1"
          autoFocus
        />
        <Button type="submit" disabled={busy || !q.trim()}>
          {busy ? "Opening…" : <Sparkles className="h-4 w-4" />}
        </Button>
      </form>

      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => ask(s)}
            className="inline-flex items-center gap-1 rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs text-neutral-700 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-800 transition"
          >
            {s}
            <ArrowRight className="h-3 w-3" />
          </button>
        ))}
      </div>
    </div>
  );
}
