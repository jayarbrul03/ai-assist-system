import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { CaseFilePdf, type CaseFileData } from "@/lib/pdf/case-file";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorised" }, { status: 401 });

  const body = (await req.json()) as {
    schemeId: string;
    dateFrom?: string;
    dateTo?: string;
    sections?: Partial<CaseFileData["sections"]>;
  };

  const { data: scheme } = await supabase
    .from("schemes")
    .select("*")
    .eq("id", body.schemeId)
    .maybeSingle();
  if (!scheme) return NextResponse.json({ error: "scheme not found" }, { status: 404 });

  const sections: CaseFileData["sections"] = {
    cover: true,
    executiveSummary: true,
    timeline: true,
    evidence: true,
    communications: true,
    records: true,
    issues: true,
    impact: true,
    audit: true,
    ...body.sections,
  };

  // Gather all data (RLS ensures user sees only what they should)
  const dateFrom = body.dateFrom ? new Date(body.dateFrom).toISOString() : null;
  const dateTo = body.dateTo ? new Date(body.dateTo).toISOString() : null;

  let evQuery = supabase
    .from("evidence_items")
    .select("*")
    .eq("scheme_id", body.schemeId)
    .order("occurred_at", { ascending: true, nullsFirst: false });
  if (dateFrom) evQuery = evQuery.gte("occurred_at", dateFrom);
  if (dateTo) evQuery = evQuery.lte("occurred_at", dateTo);

  const [
    { data: evidence },
    { data: communications },
    { data: records },
    { data: issues },
    { data: impactSummary },
    { data: auditLog },
  ] = await Promise.all([
    evQuery,
    supabase
      .from("communications")
      .select("*")
      .eq("scheme_id", body.schemeId)
      .order("created_at", { ascending: true }),
    supabase
      .from("records_requests")
      .select("*")
      .eq("scheme_id", body.schemeId)
      .order("created_at", { ascending: true }),
    supabase
      .from("legal_issues")
      .select("*")
      .eq("scheme_id", body.schemeId)
      .order("created_at", { ascending: true }),
    supabase
      .from("impact_entries")
      .select("*")
      .eq("scheme_id", body.schemeId)
      .eq("user_id", user.id)
      .order("log_date", { ascending: true }),
    supabase
      .from("audit_log")
      .select("*")
      .eq("scheme_id", body.schemeId)
      .order("created_at", { ascending: true }),
  ]);

  const data: CaseFileData = {
    schemeName: (scheme as { name: string }).name,
    cmsNumber: (scheme as { cms_number: string | null }).cms_number,
    ctsNumber: (scheme as { cts_number: string | null }).cts_number,
    generatedAt: new Date().toISOString(),
    dateRange:
      body.dateFrom || body.dateTo
        ? { from: body.dateFrom || "—", to: body.dateTo || "—" }
        : null,
    sections,
    evidence: (evidence ?? []).map((e) => {
      const ev = e as {
        occurred_at: string | null;
        source: string | null;
        description: string | null;
        exact_words: string | null;
        issue_flags: string[] | null;
        impact_flags: string[] | null;
        confidence: string;
        rule_cited: string | null;
      };
      return {
        occurred_at: ev.occurred_at,
        source: ev.source,
        description: ev.description,
        exact_words: ev.exact_words,
        issue_flags: ev.issue_flags ?? [],
        impact_flags: ev.impact_flags ?? [],
        confidence: ev.confidence,
        rule_cited: ev.rule_cited,
      };
    }),
    communications: (communications ?? []) as CaseFileData["communications"],
    records: (records ?? []) as CaseFileData["records"],
    issues: (issues ?? []) as CaseFileData["issues"],
    impactSummary: (impactSummary ?? []) as CaseFileData["impactSummary"],
    auditLog: (auditLog ?? []) as CaseFileData["auditLog"],
  };

  const pdfBuffer = await renderToBuffer(<CaseFilePdf data={data} />);

  await audit({
    action: "export_generated",
    entityType: "scheme",
    entityId: body.schemeId,
    schemeId: body.schemeId,
    metadata: {
      evidence: data.evidence.length,
      communications: data.communications.length,
      sections: Object.entries(sections)
        .filter(([, v]) => v)
        .map(([k]) => k),
    },
  });

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="parity-case-file-${body.schemeId.slice(0, 8)}.pdf"`,
    },
  });
}
