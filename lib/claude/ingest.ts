import { getAnthropic, MODELS } from "./client";
import { BYLAW_CHUNK_SYSTEM_PROMPT } from "./prompts";
import { config, isMissing } from "@/lib/config";

export interface BylawChunkDraft {
  bylaw_number: string | null;
  heading: string | null;
  content: string;
  page_number: number;
}

/**
 * Extract structured by-law provisions from raw PDF text.
 * Falls back to naive fixed-size chunking when Anthropic is not configured.
 */
export async function chunkBylawsWithClaude(
  rawText: string,
): Promise<BylawChunkDraft[]> {
  if (isMissing(config.anthropic.apiKey)) {
    return naiveChunk(rawText);
  }

  // For very large docs, split into ~20k-char windows and process sequentially.
  const windows = splitForWindow(rawText, 18000);
  const all: BylawChunkDraft[] = [];

  for (const w of windows) {
    try {
      const res = await getAnthropic().messages.create({
        model: MODELS.fast,
        max_tokens: 4096,
        system: BYLAW_CHUNK_SYSTEM_PROMPT,
        messages: [{ role: "user", content: w }],
      });
      const textBlock = res.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") continue;
      const parsed = safeJsonArray(textBlock.text);
      for (const p of parsed) {
        if (typeof p.content === "string" && p.content.trim().length > 0) {
          all.push({
            bylaw_number: str(p.bylaw_number),
            heading: str(p.heading),
            content: p.content,
            page_number:
              typeof p.page_number === "number" ? p.page_number : 1,
          });
        }
      }
    } catch {
      // Fallback for this window
      all.push(...naiveChunk(w));
    }
  }

  if (all.length === 0) return naiveChunk(rawText);
  return all;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

function safeJsonArray(s: string): Array<Record<string, unknown>> {
  const cleaned = s
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  try {
    const v = JSON.parse(cleaned);
    return Array.isArray(v) ? v : [];
  } catch {
    // Attempt to extract a JSON array substring
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start >= 0 && end > start) {
      try {
        const v = JSON.parse(cleaned.slice(start, end + 1));
        return Array.isArray(v) ? v : [];
      } catch {
        return [];
      }
    }
    return [];
  }
}

function splitForWindow(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    out.push(text.slice(i, i + max));
    i += max;
  }
  return out;
}

/**
 * Heuristic chunker. Splits by apparent by-law headings or 800-token windows.
 */
export function naiveChunk(text: string): BylawChunkDraft[] {
  const out: BylawChunkDraft[] = [];
  const lines = text.split(/\n+/);
  const headingPattern = /^\s*(?:By-?law|Section|Clause)?\s*(\d+(?:\.\d+)*)[.)\s]+(.*)/i;
  let current: BylawChunkDraft | null = null;
  let page = 1;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect page form-feed or "Page N" markers
    if (/^\s*page\s+\d+/i.test(trimmed)) {
      const m = trimmed.match(/\d+/);
      if (m) page = parseInt(m[0], 10);
      continue;
    }

    const m = trimmed.match(headingPattern);
    if (m && m[1]) {
      if (current && current.content.length > 0) out.push(current);
      current = {
        bylaw_number: m[1],
        heading: m[2]?.trim() || null,
        content: "",
        page_number: page,
      };
      continue;
    }
    if (!current) {
      current = { bylaw_number: null, heading: null, content: "", page_number: page };
    }
    current.content = current.content
      ? current.content + " " + trimmed
      : trimmed;
  }
  if (current && current.content.length > 0) out.push(current);

  // Further split any single chunk over ~3000 chars into sub-chunks.
  const final: BylawChunkDraft[] = [];
  for (const c of out) {
    if (c.content.length <= 3000) {
      final.push(c);
      continue;
    }
    const words = c.content.split(/\s+/);
    let buf: string[] = [];
    let idx = 0;
    for (const w of words) {
      buf.push(w);
      if (buf.join(" ").length > 2500) {
        final.push({
          ...c,
          content: buf.join(" "),
          bylaw_number: idx === 0 ? c.bylaw_number : null,
        });
        buf = [];
        idx++;
      }
    }
    if (buf.length) {
      final.push({ ...c, content: buf.join(" "), bylaw_number: null });
    }
  }

  return final.length > 0
    ? final
    : [{ bylaw_number: null, heading: null, content: text.slice(0, 2500), page_number: 1 }];
}
