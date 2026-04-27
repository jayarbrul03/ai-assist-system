/**
 * Hand-maintained DB types. Generate real ones via:
 *   npx supabase gen types typescript --project-id <ref> > lib/supabase/types.ts
 * once the real Supabase project exists (AU region ap-southeast-2).
 */

export type UUID = string;
export type ISODate = string;

export type SchemeRole =
  | "owner"
  | "tenant"
  | "committee_member"
  | "committee_chair"
  | "manager"
  | "observer";

export type EvidenceSource =
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

export type ConfidenceLevel = "confirmed" | "likely" | "unclear";

export type NextAction =
  | "file_only"
  | "seek_records"
  | "draft_response"
  | "legal_review"
  | "include_in_timeline"
  | "preserve_for_complaint_bundle";

export type CommsStage =
  | "stage_1_fyi"
  | "stage_2_formal_notice"
  | "stage_3_contravention_notice"
  | "stage_4_enforcement";

export type CommsStatus =
  | "draft"
  | "served"
  | "acknowledged"
  | "responded"
  | "resolved"
  | "escalated";

export interface Scheme {
  id: UUID;
  name: string;
  cms_number: string | null;
  cts_number: string | null;
  jurisdiction: string;
  governing_act: string;
  regulation_module: string | null;
  address: string | null;
  lot_count: number | null;
  onboarded_by: UUID | null;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface SchemeMembership {
  id: UUID;
  user_id: UUID;
  scheme_id: UUID;
  role: SchemeRole;
  lot_number: string | null;
  verified: boolean;
  created_at: ISODate;
}

export interface BylawDocument {
  id: UUID;
  scheme_id: UUID;
  title: string;
  source_type: string | null;
  file_url: string | null;
  raw_text: string | null;
  uploaded_by: UUID | null;
  created_at: ISODate;
}

export interface BylawChunk {
  id: UUID;
  document_id: UUID;
  scheme_id: UUID;
  chunk_index: number;
  bylaw_number: string | null;
  heading: string | null;
  content: string;
  embedding: number[] | null;
  page_number: number | null;
  created_at: ISODate;
}

export interface EvidenceItem {
  id: UUID;
  scheme_id: UUID;
  uploaded_by: UUID;
  shared_with_scheme: boolean;
  occurred_at: ISODate | null;
  occurred_at_approximate: boolean;
  location: string | null;
  people_involved: string[];
  source: EvidenceSource | null;
  file_url: string | null;
  thumbnail_url: string | null;
  description: string | null;
  exact_words: string | null;
  rule_cited: string | null;
  rule_is_in_bylaws: boolean | null;
  rule_source: string | null;
  impact_flags: string[];
  impact_notes: string | null;
  issue_flags: string[];
  confidence: ConfidenceLevel;
  next_action: NextAction;
  ai_summary: string | null;
  ai_extracted_fields: Record<string, unknown> | null;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface Communication {
  id: UUID;
  scheme_id: UUID;
  thread_id: UUID | null;
  from_user: UUID;
  to_party: string | null;
  to_party_email: string | null;
  stage: CommsStage;
  stage_skip_justification: string | null;
  subject: string | null;
  body: string | null;
  bylaw_citations: string[];
  related_evidence_ids: UUID[];
  status: CommsStatus;
  served_at: ISODate | null;
  acknowledged_at: ISODate | null;
  response_deadline: ISODate | null;
  responded_at: ISODate | null;
  created_at: ISODate;
  updated_at: ISODate;
  inbox_labels?: string[];
}

export interface RecordsRequest {
  id: UUID;
  scheme_id: UUID;
  requester_id: UUID;
  request_type: string[];
  specific_items: string | null;
  fee_acknowledged: boolean;
  submitted_at: ISODate | null;
  served_at: ISODate | null;
  statutory_deadline: ISODate | null;
  fulfilled_at: ISODate | null;
  fulfilled_partial: boolean;
  status: string;
  notes: string | null;
  created_at: ISODate;
}

export interface ImpactEntry {
  id: UUID;
  user_id: UUID;
  scheme_id: UUID;
  log_date: string;
  bc_contact_occurred: boolean;
  monitoring_observed: boolean;
  signage_or_towing_pressure: boolean;
  family_anxiety: boolean;
  avoidance_of_premises: boolean;
  new_public_content: boolean;
  new_evidence_captured: boolean;
  anxiety_score: number | null;
  disturbance_score: number | null;
  summary: string | null;
  legal_relevance: string | null;
  created_at: ISODate;
}

export interface LegalIssue {
  id: UUID;
  scheme_id: UUID;
  raised_by: UUID | null;
  issue_type: string | null;
  headline: string | null;
  detail: string | null;
  related_evidence_ids: UUID[];
  status: string;
  confidence: ConfidenceLevel;
  next_step: string | null;
  created_at: ISODate;
  updated_at: ISODate;
}

export interface ChatSession {
  id: UUID;
  user_id: UUID;
  scheme_id: UUID;
  title: string | null;
  created_at: ISODate;
}

export interface ChatMessage {
  id: UUID;
  session_id: UUID;
  role: "user" | "assistant" | "system";
  content: string;
  citations: Array<{
    bylaw_number?: string;
    page?: number;
    chunk_id?: string;
    act_section?: string;
  }> | null;
  created_at: ISODate;
}

export interface AuditLog {
  id: UUID;
  user_id: UUID | null;
  scheme_id: UUID | null;
  action: string;
  entity_type: string | null;
  entity_id: UUID | null;
  metadata: Record<string, unknown> | null;
  created_at: ISODate;
}

type Tbl<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      schemes: Tbl<Scheme>;
      scheme_memberships: Tbl<SchemeMembership>;
      bylaws_documents: Tbl<BylawDocument>;
      bylaws_chunks: Tbl<BylawChunk>;
      evidence_items: Tbl<EvidenceItem>;
      communications: Tbl<Communication>;
      records_requests: Tbl<RecordsRequest>;
      impact_entries: Tbl<ImpactEntry>;
      legal_issues: Tbl<LegalIssue>;
      chat_sessions: Tbl<ChatSession>;
      chat_messages: Tbl<ChatMessage>;
      audit_log: Tbl<AuditLog>;
    };
    Views: { [_ in never]: never };
    Functions: {
      match_bylaw_chunks: {
        Args: {
          query_embedding: number[];
          match_scheme_id: string;
          match_threshold: number;
          match_count: number;
        };
        Returns: Array<
          Pick<
            BylawChunk,
            | "id"
            | "document_id"
            | "scheme_id"
            | "bylaw_number"
            | "heading"
            | "content"
            | "page_number"
          > & { similarity: number }
        >;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
