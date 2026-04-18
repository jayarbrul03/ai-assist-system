import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { extractPdfText } from "@/lib/pdf/extract";
import { chunkBylawsWithClaude } from "@/lib/claude/ingest";
import { embedTexts } from "@/lib/claude/embeddings";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  const schemeId = form.get("schemeId");
  const title = (form.get("title") as string) || "Registered by-laws";

  if (!(file instanceof File) || typeof schemeId !== "string") {
    return NextResponse.json({ error: "missing file or schemeId" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "only PDF supported" }, { status: 400 });
  }

  // Membership check
  const { data: membership } = await supabase
    .from("scheme_memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("scheme_id", schemeId)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "not a member of this scheme" }, { status: 403 });
  }

  // Upload to storage
  const buf = new Uint8Array(await file.arrayBuffer());
  const path = `${schemeId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  let fileUrl: string | null = null;
  const { error: upErr } = await supabase.storage.from("bylaws").upload(path, buf, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (upErr) {
    // Storage bucket may not exist yet in placeholder mode; continue without.
    console.warn("[ingest] storage upload failed:", upErr.message);
  } else {
    fileUrl = path;
  }

  // Extract text
  let text = "";
  let pages = 0;
  try {
    const r = await extractPdfText(buf);
    text = r.text;
    pages = r.pageCount;
  } catch (e) {
    return NextResponse.json(
      { error: `PDF parse failed: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 },
    );
  }

  // Create document row
  const { data: doc, error: docErr } = await supabase
    .from("bylaws_documents")
    .insert({
      scheme_id: schemeId,
      title,
      source_type: "cms",
      file_url: fileUrl,
      raw_text: text.slice(0, 500000),
      uploaded_by: user.id,
    })
    .select("*")
    .single();

  if (docErr || !doc) {
    return NextResponse.json(
      { error: docErr?.message ?? "insert failed" },
      { status: 500 },
    );
  }

  // Chunk + embed (use service client to bypass RLS on chunk insert)
  const chunks = await chunkBylawsWithClaude(text);
  const embeddings = await embedTexts(chunks.map((c) => c.content));
  const service = createServiceClient();

  const rows = chunks.map((c, i) => ({
    document_id: doc.id,
    scheme_id: schemeId,
    chunk_index: i,
    bylaw_number: c.bylaw_number,
    heading: c.heading,
    content: c.content,
    embedding: embeddings[i] ?? null,
    page_number: c.page_number,
  }));

  // Batch insert in pages of 50
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const { error: insErr } = await service.from("bylaws_chunks").insert(batch);
    if (insErr) {
      console.error("[ingest] chunk insert failed:", insErr.message);
      return NextResponse.json(
        { error: `chunk insert failed: ${insErr.message}` },
        { status: 500 },
      );
    }
  }

  await audit({
    action: "bylaws_ingested",
    entityType: "bylaws_documents",
    entityId: doc.id,
    schemeId,
    metadata: { chunks: chunks.length, pages, title },
  });

  return NextResponse.json({ chunks: chunks.length, pages, documentId: doc.id });
}
