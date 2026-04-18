import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyseEvidence } from "@/lib/claude/evidence";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const rl = await checkRateLimit(user.id, "evidence_analyse");
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Daily evidence analysis limit reached (${rl.limit}).` },
      { status: 429 },
    );
  }

  const ct = req.headers.get("content-type") ?? "";

  try {
    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      const text = (form.get("text") as string) ?? undefined;
      if (file instanceof File && file.size > 0) {
        const ab = await file.arrayBuffer();
        const b64 = Buffer.from(ab).toString("base64");
        const extraction = await analyseEvidence({
          text,
          imageBase64: b64,
          imageMime: file.type,
        });
        return NextResponse.json(extraction);
      }
      const extraction = await analyseEvidence({ text });
      return NextResponse.json(extraction);
    }

    const json = (await req.json()) as { text?: string };
    const extraction = await analyseEvidence({ text: json.text });
    return NextResponse.json(extraction);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "analyse failed" },
      { status: 500 },
    );
  }
}
