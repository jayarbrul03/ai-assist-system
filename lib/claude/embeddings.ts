import { config, isMissing, requireRealConfig } from "@/lib/config";

/**
 * Voyage AI embeddings client (voyage-3, 1024-dim).
 * Falls back to a deterministic fake vector in local/dev when VOYAGE_API_KEY
 * is missing, so the pipeline can be exercised end-to-end without credentials.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (isMissing(config.voyage.apiKey)) {
    return texts.map((t) => fakeEmbedding(t));
  }
  requireRealConfig("voyage");

  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.voyage.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: texts,
      model: config.voyage.model,
      output_dimension: config.voyage.dimensions,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Voyage embeddings failed: ${res.status} ${body}`);
  }

  const json = (await res.json()) as {
    data: Array<{ embedding: number[] }>;
  };
  return json.data.map((d) => d.embedding);
}

export async function embedOne(text: string): Promise<number[]> {
  const [v] = await embedTexts([text]);
  return v;
}

/** Deterministic pseudo-embedding for placeholder mode. */
function fakeEmbedding(text: string): number[] {
  const dim = config.voyage.dimensions;
  const out = new Array(dim).fill(0);
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  for (let i = 0; i < dim; i++) {
    h = Math.imul(h ^ (h >>> 13), 2654435761);
    out[i] = ((h & 0xffff) / 0xffff - 0.5) * 2;
  }
  const norm = Math.sqrt(out.reduce((s, x) => s + x * x, 0)) || 1;
  return out.map((x) => x / norm);
}
