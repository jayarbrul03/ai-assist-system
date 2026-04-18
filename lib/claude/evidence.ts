import { getAnthropic, MODELS } from "./client";
import { EVIDENCE_ANALYSER_SYSTEM_PROMPT } from "./prompts";
import { config, isMissing } from "@/lib/config";

export interface EvidenceExtraction {
  occurred_at: string | null;
  occurred_at_approximate: boolean;
  location: string | null;
  people_involved: string[];
  source:
    | "screenshot"
    | "email"
    | "sms"
    | "notice"
    | "photo"
    | "video"
    | "audio"
    | "cctv"
    | "facebook_post"
    | "conversation"
    | "witness_account"
    | "note";
  description: string;
  exact_words: string;
  rule_cited: string;
  rule_source:
    | "registered_bylaws"
    | "signage"
    | "verbal"
    | "facebook"
    | "committee_minutes"
    | "unknown";
  impact_flags: string[];
  issue_flags: string[];
  confidence: "confirmed" | "likely" | "unclear";
  suggested_next_action:
    | "file_only"
    | "seek_records"
    | "draft_response"
    | "legal_review"
    | "include_in_timeline"
    | "preserve_for_complaint_bundle";
  ai_summary: string;
}

export async function analyseEvidence(args: {
  text?: string;
  imageBase64?: string;
  imageMime?: string;
}): Promise<EvidenceExtraction> {
  if (isMissing(config.anthropic.apiKey)) {
    return fallbackExtraction(args.text);
  }

  const userContent: Array<
    | { type: "text"; text: string }
    | { type: "image"; source: { type: "base64"; media_type: "image/png" | "image/jpeg" | "image/gif" | "image/webp"; data: string } }
  > = [];

  if (args.imageBase64 && args.imageMime) {
    const allowed = ["image/png", "image/jpeg", "image/gif", "image/webp"];
    const media = allowed.includes(args.imageMime) ? args.imageMime : "image/png";
    userContent.push({
      type: "image",
      source: { type: "base64", media_type: media as "image/png", data: args.imageBase64 },
    });
  }
  if (args.text) {
    userContent.push({ type: "text", text: args.text });
  } else if (!args.imageBase64) {
    throw new Error("analyseEvidence requires text or image input");
  }

  const res = await getAnthropic().messages.create({
    model: args.imageBase64 ? MODELS.chat : MODELS.fast,
    max_tokens: 1024,
    system: EVIDENCE_ANALYSER_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
  });

  const textBlock = res.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return fallbackExtraction(args.text);
  }

  return safeParseExtraction(textBlock.text) ?? fallbackExtraction(args.text);
}

function safeParseExtraction(raw: string): EvidenceExtraction | null {
  try {
    const cleaned = raw
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    const obj = JSON.parse(cleaned) as Partial<EvidenceExtraction>;
    return normalize(obj);
  } catch {
    // Try to carve out the first JSON object
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        const obj = JSON.parse(raw.slice(start, end + 1)) as Partial<EvidenceExtraction>;
        return normalize(obj);
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normalize(obj: Partial<EvidenceExtraction>): EvidenceExtraction {
  return {
    occurred_at: obj.occurred_at ?? null,
    occurred_at_approximate: !!obj.occurred_at_approximate,
    location: obj.location ?? null,
    people_involved: Array.isArray(obj.people_involved) ? obj.people_involved : [],
    source: (obj.source as EvidenceExtraction["source"]) ?? "note",
    description: obj.description ?? "",
    exact_words: obj.exact_words ?? "",
    rule_cited: obj.rule_cited ?? "",
    rule_source: (obj.rule_source as EvidenceExtraction["rule_source"]) ?? "unknown",
    impact_flags: Array.isArray(obj.impact_flags) ? obj.impact_flags : [],
    issue_flags: Array.isArray(obj.issue_flags) ? obj.issue_flags : [],
    confidence: (obj.confidence as EvidenceExtraction["confidence"]) ?? "unclear",
    suggested_next_action:
      (obj.suggested_next_action as EvidenceExtraction["suggested_next_action"]) ?? "file_only",
    ai_summary: obj.ai_summary ?? "",
  };
}

function fallbackExtraction(text?: string): EvidenceExtraction {
  const summary = (text ?? "").slice(0, 200);
  return {
    occurred_at: null,
    occurred_at_approximate: false,
    location: null,
    people_involved: [],
    source: "note",
    description: summary || "Evidence item.",
    exact_words: text ?? "",
    rule_cited: "",
    rule_source: "unknown",
    impact_flags: [],
    issue_flags: [],
    confidence: "unclear",
    suggested_next_action: "file_only",
    ai_summary: summary || "Placeholder extraction. Configure Anthropic API key to enable AI analysis.",
  };
}
