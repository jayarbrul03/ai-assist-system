import { extractText, getDocumentProxy } from "unpdf";

export interface ExtractResult {
  text: string;
  pageCount: number;
}

export async function extractPdfText(buf: ArrayBuffer | Uint8Array): Promise<ExtractResult> {
  const bytes =
    buf instanceof Uint8Array ? buf : new Uint8Array(buf as ArrayBuffer);
  const pdf = await getDocumentProxy(bytes);
  const { text, totalPages } = await extractText(pdf, { mergePages: true });
  return {
    text: Array.isArray(text) ? text.join("\n") : text,
    pageCount: totalPages,
  };
}
