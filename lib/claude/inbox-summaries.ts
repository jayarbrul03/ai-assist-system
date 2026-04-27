import { getAnthropic, MODELS } from "./client";
import { config, isMissing } from "@/lib/config";

export type InboxTriage = "urgent" | "standard" | "info";

export interface InboxSummaryItem {
  id: string;
  summary: string;
  triage: InboxTriage;
}

function fallbackItem(args: {
  id: string;
  subject: string | null;
  body: string | null;
}): InboxSummaryItem {
  const raw = (args.body ?? args.subject ?? "").replace(/\s+/g, " ").trim();
  const summary =
    raw.length > 140 ? `${raw.slice(0, 140)}…` : raw || "(No text)";
  return { id: args.id, summary, triage: "standard" };
}

export async function batchInboxSummaries(
  items: Array<{
    id: string;
    subject: string | null;
    body: string | null;
    to_party: string | null;
    status: string | null;
  }>,
): Promise<InboxSummaryItem[]> {
  if (items.length === 0) return [];
  if (isMissing(config.anthropic.apiKey)) {
    return items.map((i) => fallbackItem(i));
  }
  const lines = items.map((i) => {
    const body = (i.body ?? "").slice(0, 1200);
    return `ID=${i.id}
To: ${i.to_party ?? "—"} · ${i.status ?? "—"}
Subject: ${i.subject ?? ""}
${body}`;
  });
  const user = `JSON only: {"items":[{"id":"uuid","summary":"max 40 words neutral","triage":"urgent|standard|info"}]}

${lines.join("\n\n---\n\n")}`;

  try {
    const res = await getAnthropic().messages.create({
      model: MODELS.fast,
      max_tokens: 2048,
      system: `Body corporate (Australia). Neutral summaries. No legal advice. JSON only.`,
      messages: [{ role: "user", content: user }],
    });
    const textBlock = res.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return items.map((i) => fallbackItem(i));
    }
    const raw = textBlock.text
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    const parsed = JSON.parse(raw) as {
      items?: Array<{ id: string; summary: string; triage: string }>;
    };
    const m = new Map<string, InboxSummaryItem>();
    for (const x of parsed.items ?? []) {
      const triage: InboxTriage =
        x.triage === "urgent" || x.triage === "info" ? x.triage : "standard";
      if (x.id && x.summary) m.set(x.id, { id: x.id, summary: x.summary.trim(), triage });
    }
    return items.map((i) => m.get(i.id) ?? fallbackItem(i));
  } catch {
    return items.map((i) => fallbackItem(i));
  }
}
