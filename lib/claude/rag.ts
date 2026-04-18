import type { SupabaseClient } from "@supabase/supabase-js";
import { embedOne } from "./embeddings";
import { config } from "@/lib/config";

export interface RagHit {
  id: string;
  document_id: string;
  scheme_id: string;
  bylaw_number: string | null;
  heading: string | null;
  content: string;
  page_number: number | null;
  similarity: number;
}

export async function searchBylaws(
  supabase: SupabaseClient,
  schemeId: string,
  query: string,
  opts?: { topK?: number; threshold?: number },
): Promise<RagHit[]> {
  const topK = opts?.topK ?? config.rag.topK;
  const threshold = opts?.threshold ?? config.rag.similarityThreshold;
  const embedding = await embedOne(query);

  const { data, error } = await supabase.rpc("match_bylaw_chunks", {
    query_embedding: embedding,
    match_scheme_id: schemeId,
    match_threshold: threshold,
    match_count: topK,
  });

  if (error) {
    console.error("[rag] match failed:", error.message);
    return [];
  }
  return (data as RagHit[]) ?? [];
}

export function formatCitationsForPrompt(hits: RagHit[]): string {
  if (hits.length === 0) return "(no relevant by-law chunks found)";
  return hits
    .map((h, i) => {
      const num = h.bylaw_number ? `By-law ${h.bylaw_number}` : `Provision ${i + 1}`;
      const page = h.page_number ? `, p.${h.page_number}` : "";
      const head = h.heading ? ` — ${h.heading}` : "";
      return `[${num}${page}]${head}\n${h.content.trim()}\n(similarity: ${h.similarity.toFixed(2)})`;
    })
    .join("\n\n---\n\n");
}
