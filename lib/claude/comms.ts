import { getAnthropic, MODELS } from "./client";
import {
  COMMS_DRAFTER_SYSTEM_PROMPT,
  RECORDS_DRAFTER_SYSTEM_PROMPT,
  CONTENT_MODERATION_PROMPT,
} from "./prompts";
import { config, isMissing } from "@/lib/config";

export interface Draft {
  subject: string;
  body: string;
}

export interface ModerationResult {
  flagged: boolean;
  issues: Array<{ phrase: string; reason: string; suggestion: string }>;
  overall_risk: "low" | "medium" | "high";
}

function safeParseJson<T>(raw: string, fallback: T): T {
  try {
    const cleaned = raw
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    const s = raw.indexOf("{");
    const e = raw.lastIndexOf("}");
    if (s >= 0 && e > s) {
      try {
        return JSON.parse(raw.slice(s, e + 1)) as T;
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
}

export async function draftCommunication(args: {
  stage: "stage_1_fyi" | "stage_2_formal_notice" | "stage_3_contravention_notice" | "stage_4_enforcement";
  schemeName: string;
  fromName: string;
  fromLot?: string;
  toParty: string;
  topic: string;
  bylawCitations?: string[];
  linkedEvidence?: Array<{ description?: string | null; occurred_at?: string | null; exact_words?: string | null }>;
  priorStageSummary?: string;
  stageSkipJustification?: string;
}): Promise<Draft> {
  if (isMissing(config.anthropic.apiKey)) {
    return fallbackCommsDraft(args);
  }

  const userContent = buildCommsUserPrompt(args);

  const res = await getAnthropic().messages.create({
    model: MODELS.chat,
    max_tokens: 1024,
    system: COMMS_DRAFTER_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });

  const textBlock = res.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return fallbackCommsDraft(args);
  return safeParseJson<Draft>(textBlock.text, fallbackCommsDraft(args));
}

export async function draftRecordsRequest(args: {
  schemeName: string;
  requesterName: string;
  lotNumber?: string;
  requestTypes: string[];
  specificItems?: string;
}): Promise<Draft> {
  if (isMissing(config.anthropic.apiKey)) {
    return fallbackRecordsDraft(args);
  }

  const user = `Scheme: ${args.schemeName}
Requester: ${args.requesterName}${args.lotNumber ? ` (Lot ${args.lotNumber})` : ""}
Record types requested: ${args.requestTypes.join(", ")}
${args.specificItems ? `Specific items: ${args.specificItems}` : ""}`;

  const res = await getAnthropic().messages.create({
    model: MODELS.fast,
    max_tokens: 1024,
    system: RECORDS_DRAFTER_SYSTEM_PROMPT,
    messages: [{ role: "user", content: user }],
  });

  const textBlock = res.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return fallbackRecordsDraft(args);
  return safeParseJson<Draft>(textBlock.text, fallbackRecordsDraft(args));
}

export async function moderateDraft(body: string): Promise<ModerationResult> {
  if (isMissing(config.anthropic.apiKey)) {
    return naiveModeration(body);
  }
  const res = await getAnthropic().messages.create({
    model: MODELS.fast,
    max_tokens: 512,
    system: CONTENT_MODERATION_PROMPT,
    messages: [{ role: "user", content: body }],
  });
  const textBlock = res.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") return naiveModeration(body);
  return safeParseJson<ModerationResult>(textBlock.text, naiveModeration(body));
}

function naiveModeration(body: string): ModerationResult {
  const triggers = [
    { re: /\b(corrupt|fraudster|criminal|thief|stolen)\b/i, reason: "imputes criminality" },
    { re: /\b(harass|harassment|abuse|abusive)\b/i, reason: "characterises conduct as legally wrongful" },
    { re: /\bthreaten/i, reason: "describes threats without evidence" },
    { re: /\bidiot|incompetent|stupid\b/i, reason: "personal attack" },
  ];
  const issues: ModerationResult["issues"] = [];
  for (const t of triggers) {
    const m = body.match(t.re);
    if (m) {
      issues.push({ phrase: m[0], reason: t.reason, suggestion: "soften to a factual description" });
    }
  }
  return {
    flagged: issues.length > 0,
    issues,
    overall_risk: issues.length >= 2 ? "high" : issues.length === 1 ? "medium" : "low",
  };
}

function buildCommsUserPrompt(args: Parameters<typeof draftCommunication>[0]): string {
  const parts: string[] = [];
  parts.push(`Stage requested: ${args.stage}`);
  parts.push(`From: ${args.fromName}${args.fromLot ? ` (Lot ${args.fromLot})` : ""}`);
  parts.push(`To: ${args.toParty}`);
  parts.push(`Scheme: ${args.schemeName}`);
  parts.push(`Topic: ${args.topic}`);
  if (args.bylawCitations && args.bylawCitations.length) {
    parts.push(`By-law citations to include: ${args.bylawCitations.join(", ")}`);
  }
  if (args.linkedEvidence && args.linkedEvidence.length) {
    parts.push(
      "Linked evidence:\n" +
        args.linkedEvidence
          .map(
            (e, i) =>
              ` ${i + 1}. ${e.occurred_at ?? "(undated)"} — ${e.description ?? "(no description)"}`,
          )
          .join("\n"),
    );
  }
  if (args.priorStageSummary) parts.push(`Prior stage summary: ${args.priorStageSummary}`);
  if (args.stageSkipJustification)
    parts.push(`User justification for skipping earlier stage: ${args.stageSkipJustification}`);
  return parts.join("\n\n");
}

function fallbackCommsDraft(args: Parameters<typeof draftCommunication>[0]): Draft {
  const stageLabel = {
    stage_1_fyi: "Friendly FYI",
    stage_2_formal_notice: "Formal Notice",
    stage_3_contravention_notice: "Contravention Notice (BCCM Form 10)",
    stage_4_enforcement: "Notice of Dispute / Intent to Lodge",
  }[args.stage];
  const subject = `${stageLabel} — ${args.topic}`;
  const body = `Dear ${args.toParty},

I am writing in relation to ${args.topic} concerning ${args.schemeName}.

${
  args.linkedEvidence && args.linkedEvidence.length
    ? `The following items are relevant to this matter:\n${args.linkedEvidence
        .map((e, i) => ` ${i + 1}. ${e.occurred_at ?? "(undated)"} — ${e.description ?? "(no description)"}`)
        .join("\n")}\n\n`
    : ""
}I would appreciate a written response addressing:
1. The precise by-law, resolution, or lawful basis for your position.
2. A proposed path forward to resolve this matter.

${args.bylawCitations?.length ? `Relevant by-laws: ${args.bylawCitations.join(", ")}\n\n` : ""}This communication is made for the purpose of resolving a dispute and preserving the record.

Regards,
${args.fromName}${args.fromLot ? `\nLot ${args.fromLot}` : ""}`;
  return { subject, body };
}

function fallbackRecordsDraft(args: Parameters<typeof draftRecordsRequest>[0]): Draft {
  const subject = `Records request — ${args.schemeName}`;
  const body = `Dear Body Corporate,

Pursuant to my rights as a person entitled to access records under the Body Corporate and Community Management Act 1997 (Qld) and the applicable regulation module, I request access to the following records:

${args.requestTypes.map((t) => `- ${t.replace(/_/g, " ")}`).join("\n")}
${args.specificItems ? `\nSpecific items: ${args.specificItems}` : ""}

I acknowledge that reasonable copy fees may apply and request an itemised fee quote where applicable.

Please confirm receipt and provide access or copies within 7 days of this request being served and any fee being paid, as required by the Act.

Regards,
${args.requesterName}${args.lotNumber ? `\nLot ${args.lotNumber}` : ""}`;
  return { subject, body };
}
