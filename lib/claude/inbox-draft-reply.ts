import { getAnthropic, MODELS } from "./client";
import { config, isMissing } from "@/lib/config";

export interface DraftReplyResult {
  subject: string;
  body: string;
}

export async function draftInboxReply(args: {
  schemeName: string;
  originalSubject: string | null;
  originalBody: string | null;
  toParty: string | null;
}): Promise<DraftReplyResult> {
  if (isMissing(config.anthropic.apiKey)) {
    return {
      subject: (args.originalSubject ?? "Re: your message").slice(0, 100),
      body: `We acknowledge your message and will respond in writing.\n\n(Configure ANTHROPIC_API_KEY for an AI draft.)`,
    };
  }
  const user = `Scheme: ${args.schemeName}
Addressed to: ${args.toParty ?? "—"}
Subject: ${args.originalSubject ?? ""}
Message:
${(args.originalBody ?? "").slice(0, 8000)}

Draft a neutral reply the committee or manager could send. Under 300 words. Australian English. Not legal advice.

JSON: {"subject":"...","body":"..."}`;

  const res = await getAnthropic().messages.create({
    model: MODELS.fast,
    max_tokens: 1024,
    system: `Output JSON only. No markdown fences.`,
    messages: [{ role: "user", content: user }],
  });
  const textBlock = res.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return { subject: "Re: your message", body: "We acknowledge your message." };
  }
  const raw = textBlock.text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  try {
    const p = JSON.parse(raw) as { subject?: string; body?: string };
    return {
      subject: p.subject?.trim() || "Re: your message",
      body: p.body?.trim() || raw,
    };
  } catch {
    return { subject: "Re: your message", body: textBlock.text };
  }
}
