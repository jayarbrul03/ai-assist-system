import { createClient } from "@/lib/supabase/server";

export type AuditAction =
  | "scheme_created"
  | "bylaws_uploaded"
  | "bylaws_ingested"
  | "evidence_created"
  | "evidence_updated"
  | "evidence_shared"
  | "comms_drafted"
  | "comms_served"
  | "comms_leadership_status"
  | "comms_stage_skipped"
  | "records_drafted"
  | "records_submitted"
  | "records_fulfilled"
  | "impact_logged"
  | "issue_raised"
  | "issue_updated"
  | "export_generated"
  | "chat_message"
  | "inbox_ai_batch"
  | "inbox_draft_reply"
  | "inbox_labels_updated"
  | "rls_denial";

export async function audit(entry: {
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  schemeId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("audit_log").insert({
      user_id: user?.id ?? null,
      scheme_id: entry.schemeId ?? null,
      action: entry.action,
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId ?? null,
      metadata: entry.metadata ?? null,
    });
  } catch (e) {
    // Do not break the user-facing flow if audit write fails.
    console.error("[audit] failed", e);
  }
}
