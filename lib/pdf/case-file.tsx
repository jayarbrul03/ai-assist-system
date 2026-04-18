import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

export interface CaseFileData {
  schemeName: string;
  cmsNumber: string | null;
  ctsNumber: string | null;
  generatedAt: string;
  dateRange: { from: string; to: string } | null;
  sections: {
    cover: boolean;
    executiveSummary: boolean;
    timeline: boolean;
    evidence: boolean;
    communications: boolean;
    records: boolean;
    issues: boolean;
    impact: boolean;
    audit: boolean;
  };
  evidence: Array<{
    occurred_at: string | null;
    source: string | null;
    description: string | null;
    exact_words: string | null;
    issue_flags: string[];
    impact_flags: string[];
    confidence: string;
    rule_cited: string | null;
  }>;
  communications: Array<{
    subject: string | null;
    stage: string;
    status: string;
    served_at: string | null;
    body: string | null;
    to_party: string | null;
  }>;
  records: Array<{
    request_type: string[];
    status: string;
    submitted_at: string | null;
    statutory_deadline: string | null;
    fulfilled_at: string | null;
  }>;
  issues: Array<{
    headline: string | null;
    issue_type: string | null;
    status: string;
    confidence: string;
    detail: string | null;
  }>;
  impactSummary: Array<{
    log_date: string;
    anxiety_score: number | null;
    disturbance_score: number | null;
    summary: string | null;
  }>;
  auditLog: Array<{
    action: string;
    created_at: string;
    entity_type: string | null;
  }>;
}

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#0a0a0a",
    lineHeight: 1.5,
  },
  cover: {
    padding: 72,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#0a0a0a",
  },
  brand: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: "#0f766e",
    marginBottom: 8,
  },
  subtitle: { color: "#737373", fontSize: 11, marginBottom: 40 },
  coverTitle: { fontSize: 32, fontFamily: "Helvetica-Bold", marginBottom: 24, lineHeight: 1.2 },
  meta: { color: "#737373", fontSize: 10, marginTop: 16 },
  section: { marginTop: 24, marginBottom: 16 },
  h1: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#0a0a0a",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 4,
  },
  h2: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 12, marginBottom: 4 },
  row: { flexDirection: "row", gap: 8, marginBottom: 4 },
  label: { color: "#737373", width: 90 },
  value: { flex: 1 },
  item: { marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  quote: {
    borderLeftWidth: 2,
    borderLeftColor: "#0f766e",
    paddingLeft: 8,
    color: "#404040",
    fontStyle: "italic",
    marginTop: 4,
  },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 48,
    right: 48,
    fontSize: 8,
    color: "#737373",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  badge: {
    fontSize: 8,
    backgroundColor: "#f1f5f9",
    color: "#1e293b",
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    borderRadius: 3,
  },
  disclaimer: {
    marginTop: 16,
    padding: 10,
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fde68a",
    color: "#78350f",
    fontSize: 9,
  },
});

const DISCLAIMER_TEXT =
  "This case file is general information from your registered by-laws and Queensland legislation, not legal advice. For binding decisions, seek independent legal advice.";

function FooterBlock({ data }: { data: CaseFileData }) {
  return (
    <View style={styles.footer} fixed>
      <Text>
        {data.schemeName} · Parity case file · Generated {new Date(data.generatedAt).toLocaleString("en-AU")}
      </Text>
      <Text
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

export function CaseFilePdf({ data }: { data: CaseFileData }) {
  return (
    <Document
      title={`${data.schemeName} — Parity case file`}
      author="Parity"
      subject="Body corporate dispute case file"
    >
      {data.sections.cover ? (
        <Page size="A4" style={styles.cover}>
          <Text style={styles.brand}>Parity</Text>
          <Text style={styles.subtitle}>
            Case file · {data.schemeName}
          </Text>
          <Text style={styles.coverTitle}>
            Body corporate matter —{"\n"}Evidence bundle &amp; timeline
          </Text>
          {data.cmsNumber ? <Text style={styles.meta}>CMS: {data.cmsNumber}</Text> : null}
          {data.ctsNumber ? <Text style={styles.meta}>CTS: {data.ctsNumber}</Text> : null}
          <Text style={styles.meta}>
            Generated: {new Date(data.generatedAt).toLocaleString("en-AU")}
          </Text>
          {data.dateRange ? (
            <Text style={styles.meta}>
              Date range: {data.dateRange.from} to {data.dateRange.to}
            </Text>
          ) : null}
          <View style={styles.disclaimer}>
            <Text>{DISCLAIMER_TEXT}</Text>
          </View>
          <FooterBlock data={data} />
        </Page>
      ) : null}

      {data.sections.executiveSummary ? (
        <Page size="A4" style={styles.page}>
          <Text style={styles.h1}>Executive summary</Text>
          <Text>
            Evidence items: {data.evidence.length}. Communications: {data.communications.length}.
            Records requests: {data.records.length}. Issues raised: {data.issues.length}.
            Impact Log entries: {data.impactSummary.length}.
          </Text>
          <View style={styles.section}>
            <Text style={styles.h2}>Top issue flags</Text>
            <Text>
              {[...new Set(data.evidence.flatMap((e) => e.issue_flags || []))]
                .slice(0, 10)
                .map((f) => f.replace(/_/g, " "))
                .join(", ") || "—"}
            </Text>
          </View>
          <View style={styles.disclaimer}>
            <Text>{DISCLAIMER_TEXT}</Text>
          </View>
          <FooterBlock data={data} />
        </Page>
      ) : null}

      {data.sections.timeline && data.evidence.length > 0 ? (
        <Page size="A4" style={styles.page}>
          <Text style={styles.h1}>Master timeline</Text>
          {data.evidence
            .filter((e) => e.occurred_at)
            .map((e, i) => (
              <View key={i} style={styles.item} wrap={false}>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>
                  {e.occurred_at ? new Date(e.occurred_at).toLocaleString("en-AU") : "—"}
                  {"  "}
                  <Text style={{ fontFamily: "Helvetica", color: "#737373" }}>
                    ({e.source || "note"})
                  </Text>
                </Text>
                <Text>{e.description || "(no description)"}</Text>
                {e.exact_words ? (
                  <View style={styles.quote}>
                    <Text>&ldquo;{e.exact_words}&rdquo;</Text>
                  </View>
                ) : null}
              </View>
            ))}
          <FooterBlock data={data} />
        </Page>
      ) : null}

      {data.sections.evidence && data.evidence.length > 0 ? (
        <Page size="A4" style={styles.page}>
          <Text style={styles.h1}>Evidence register</Text>
          {data.evidence.map((e, i) => (
            <View key={i} style={styles.item} wrap={false}>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>#{i + 1} · {e.source || "note"} · {e.confidence}</Text>
              <View style={styles.row}>
                <Text style={styles.label}>Occurred</Text>
                <Text style={styles.value}>
                  {e.occurred_at ? new Date(e.occurred_at).toLocaleString("en-AU") : "—"}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Description</Text>
                <Text style={styles.value}>{e.description || "—"}</Text>
              </View>
              {e.rule_cited ? (
                <View style={styles.row}>
                  <Text style={styles.label}>Rule cited</Text>
                  <Text style={styles.value}>{e.rule_cited}</Text>
                </View>
              ) : null}
              {(e.issue_flags || []).length > 0 ? (
                <View style={styles.row}>
                  <Text style={styles.label}>Issue flags</Text>
                  <Text style={styles.value}>
                    {e.issue_flags.map((f) => f.replace(/_/g, " ")).join(", ")}
                  </Text>
                </View>
              ) : null}
              {e.exact_words ? (
                <View style={styles.quote}>
                  <Text>&ldquo;{e.exact_words}&rdquo;</Text>
                </View>
              ) : null}
            </View>
          ))}
          <FooterBlock data={data} />
        </Page>
      ) : null}

      {data.sections.communications && data.communications.length > 0 ? (
        <Page size="A4" style={styles.page}>
          <Text style={styles.h1}>Communications register</Text>
          {data.communications.map((c, i) => (
            <View key={i} style={styles.item} wrap={false}>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>{c.subject || "(no subject)"}</Text>
              <Text style={{ color: "#737373" }}>
                {c.stage.replace(/_/g, " ")} · {c.status} · to {c.to_party || "—"}
                {c.served_at ? ` · served ${new Date(c.served_at).toLocaleString("en-AU")}` : ""}
              </Text>
              {c.body ? (
                <Text style={{ marginTop: 4 }}>{c.body.slice(0, 1200)}</Text>
              ) : null}
            </View>
          ))}
          <FooterBlock data={data} />
        </Page>
      ) : null}

      {data.sections.records && data.records.length > 0 ? (
        <Page size="A4" style={styles.page}>
          <Text style={styles.h1}>Records requests register</Text>
          {data.records.map((r, i) => (
            <View key={i} style={styles.item} wrap={false}>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>{(r.request_type || []).join(", ")}</Text>
              <Text>
                Status: {r.status}
                {r.submitted_at ? ` · submitted ${new Date(r.submitted_at).toLocaleDateString("en-AU")}` : ""}
                {r.statutory_deadline ? ` · deadline ${new Date(r.statutory_deadline).toLocaleDateString("en-AU")}` : ""}
                {r.fulfilled_at ? ` · fulfilled ${new Date(r.fulfilled_at).toLocaleDateString("en-AU")}` : ""}
              </Text>
            </View>
          ))}
          <FooterBlock data={data} />
        </Page>
      ) : null}

      {data.sections.issues && data.issues.length > 0 ? (
        <Page size="A4" style={styles.page}>
          <Text style={styles.h1}>Legal issue register</Text>
          {data.issues.map((it, i) => (
            <View key={i} style={styles.item} wrap={false}>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>{it.headline}</Text>
              <Text style={{ color: "#737373" }}>
                {(it.issue_type || "").replace(/_/g, " ")} · {it.status} · {it.confidence}
              </Text>
              {it.detail ? <Text style={{ marginTop: 4 }}>{it.detail}</Text> : null}
            </View>
          ))}
          <FooterBlock data={data} />
        </Page>
      ) : null}

      {data.sections.impact && data.impactSummary.length > 0 ? (
        <Page size="A4" style={styles.page}>
          <Text style={styles.h1}>Impact log summary</Text>
          {data.impactSummary.map((e, i) => (
            <View key={i} style={styles.item} wrap={false}>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>{e.log_date}</Text>
              <Text>
                Anxiety: {e.anxiety_score ?? 0}/10 · Disturbance: {e.disturbance_score ?? 0}/10
              </Text>
              {e.summary ? <Text>{e.summary}</Text> : null}
            </View>
          ))}
          <FooterBlock data={data} />
        </Page>
      ) : null}

      {data.sections.audit && data.auditLog.length > 0 ? (
        <Page size="A4" style={styles.page}>
          <Text style={styles.h1}>Audit log</Text>
          {data.auditLog.slice(0, 200).map((a, i) => (
            <Text key={i} style={{ marginBottom: 2 }}>
              {new Date(a.created_at).toLocaleString("en-AU")} · {a.action}
              {a.entity_type ? ` · ${a.entity_type}` : ""}
            </Text>
          ))}
          <View style={styles.disclaimer}>
            <Text>{DISCLAIMER_TEXT}</Text>
          </View>
          <FooterBlock data={data} />
        </Page>
      ) : null}
    </Document>
  );
}
