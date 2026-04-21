/**
 * In-memory demo database. Lives on globalThis so it's shared across
 * server requests in a single Next dev process. Not persistent across
 * restarts. Used only when `isPlaceholderConfig()` is true.
 */

import type {
  Scheme,
  SchemeMembership,
  EvidenceItem,
  Communication,
  RecordsRequest,
  ImpactEntry,
  LegalIssue,
  ChatSession,
  ChatMessage,
  BylawDocument,
  BylawChunk,
  AuditLog,
  SchemeRole,
} from "@/lib/supabase/types";

export interface DemoUser {
  id: string;
  email: string;
  role: SchemeRole;
  fullName: string;
}

export interface DemoDB {
  users: DemoUser[];
  schemes: Scheme[];
  scheme_memberships: SchemeMembership[];
  bylaws_documents: BylawDocument[];
  bylaws_chunks: BylawChunk[];
  evidence_items: EvidenceItem[];
  communications: Communication[];
  records_requests: RecordsRequest[];
  impact_entries: ImpactEntry[];
  legal_issues: LegalIssue[];
  chat_sessions: ChatSession[];
  chat_messages: ChatMessage[];
  audit_log: AuditLog[];
}

declare global {
  // eslint-disable-next-line no-var
  var __parityDemoDB: DemoDB | undefined;
}

const SCHEME_ID = "d0000000-0000-0000-0000-000000000001";
const DOC_ID = "d0000000-0000-0000-0000-000000000010";

export const DEMO_USERS: Record<SchemeRole, DemoUser> = {
  owner: {
    id: "u0000000-0000-0000-0000-000000000001",
    email: "owner@demo.parity",
    role: "owner",
    fullName: "Sam Wu (Lot Owner)",
  },
  committee_chair: {
    id: "u0000000-0000-0000-0000-000000000002",
    email: "chair@demo.parity",
    role: "committee_chair",
    fullName: "Priya Rao (Committee Chair)",
  },
  committee_member: {
    id: "u0000000-0000-0000-0000-000000000003",
    email: "member@demo.parity",
    role: "committee_member",
    fullName: "David Kim (Committee Member)",
  },
  tenant: {
    id: "u0000000-0000-0000-0000-000000000004",
    email: "tenant@demo.parity",
    role: "tenant",
    fullName: "Alex Johns (Tenant)",
  },
  manager: {
    id: "u0000000-0000-0000-0000-000000000005",
    email: "manager@demo.parity",
    role: "manager",
    fullName: "Janelle Park (Body Corporate Manager)",
  },
  observer: {
    id: "u0000000-0000-0000-0000-000000000006",
    email: "observer@demo.parity",
    role: "observer",
    fullName: "Observer",
  },
};

const now = () => new Date().toISOString();
const daysAgo = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toISOString();

function seed(): DemoDB {
  const users = Object.values(DEMO_USERS);

  const scheme: Scheme = {
    id: SCHEME_ID,
    name: "Riverbend Residences CTS 48211",
    cms_number: "CMS-2019-4281",
    cts_number: "48211",
    jurisdiction: "QLD",
    governing_act: "BCCM 1997",
    regulation_module: "Accommodation Module",
    address: "12 Skyline Drive, South Brisbane QLD 4101",
    lot_count: 86,
    onboarded_by: DEMO_USERS.owner.id,
    created_at: daysAgo(90),
    updated_at: now(),
  };

  const memberships: SchemeMembership[] = users.map((u, i) => ({
    id: `m000000-0000-0000-0000-00000000000${i + 1}`,
    user_id: u.id,
    scheme_id: SCHEME_ID,
    role: u.role,
    lot_number:
      u.role === "owner"
        ? "12"
        : u.role === "tenant"
        ? "24"
        : u.role === "committee_chair"
        ? "7"
        : u.role === "committee_member"
        ? "19"
        : null,
    verified: true,
    created_at: daysAgo(89 - i),
  }));

  const doc: BylawDocument = {
    id: DOC_ID,
    scheme_id: SCHEME_ID,
    title: "Registered By-Laws (CMS 2019-4281)",
    source_type: "cms",
    file_url: null,
    raw_text: null,
    uploaded_by: DEMO_USERS.owner.id,
    created_at: daysAgo(88),
  };

  const chunks: BylawChunk[] = [
    {
      id: "c0000000-0000-0000-0000-000000000001",
      document_id: DOC_ID,
      scheme_id: SCHEME_ID,
      chunk_index: 0,
      bylaw_number: "12.3",
      heading: "Visitor parking",
      content:
        "Visitors may park in bays marked VISITOR for a maximum of 48 consecutive hours. Residents may not park in visitor bays at any time. Vehicles remaining beyond the stated period may be subject to enforcement consistent with the BCCM Act and any resolution of the committee.",
      embedding: null,
      page_number: 7,
      created_at: daysAgo(88),
    },
    {
      id: "c0000000-0000-0000-0000-000000000002",
      document_id: DOC_ID,
      scheme_id: SCHEME_ID,
      chunk_index: 1,
      bylaw_number: "15.1",
      heading: "Noise",
      content:
        "An occupier of a lot must not make or cause noise likely to interfere with the peaceful enjoyment of another lot or common property between 10:00pm and 7:00am.",
      embedding: null,
      page_number: 9,
      created_at: daysAgo(88),
    },
    {
      id: "c0000000-0000-0000-0000-000000000003",
      document_id: DOC_ID,
      scheme_id: SCHEME_ID,
      chunk_index: 2,
      bylaw_number: "21.2",
      heading: "Records access",
      content:
        "A person entitled under the Act to inspect the body corporate's records may request access in writing. The body corporate must make records available within 7 days of the request being served and any applicable fee being paid.",
      embedding: null,
      page_number: 13,
      created_at: daysAgo(88),
    },
    {
      id: "c0000000-0000-0000-0000-000000000004",
      document_id: DOC_ID,
      scheme_id: SCHEME_ID,
      chunk_index: 3,
      bylaw_number: "8.4",
      heading: "Parking orientation",
      content:
        "No by-law prescribes a direction in which vehicles must be parked. Committee signage about reversing or head-in parking is for guidance only and does not of itself constitute a contravention.",
      embedding: null,
      page_number: 5,
      created_at: daysAgo(88),
    },
  ];

  const evidence: EvidenceItem[] = [
    {
      id: "e0000000-0000-0000-0000-000000000001",
      scheme_id: SCHEME_ID,
      uploaded_by: DEMO_USERS.owner.id,
      shared_with_scheme: false,
      occurred_at: daysAgo(12),
      occurred_at_approximate: false,
      location: "Visitor bay 3, basement",
      people_involved: ["Janelle Park"],
      source: "email",
      file_url: null,
      thumbnail_url: null,
      description:
        "Email from the body corporate manager instructing removal of a visitor's car within 2 hours, citing 'committee rule' not present in the registered by-laws.",
      exact_words:
        "Your visitor's vehicle in bay 3 must be moved within the next 2 hours or it will be towed at the owner's cost, as per committee rules on visitor parking.",
      rule_cited: "committee rule on visitor parking",
      rule_is_in_bylaws: false,
      rule_source: "verbal",
      impact_flags: ["anxiety", "interference_with_enjoyment"],
      impact_notes: null,
      issue_flags: ["overreach", "invalid_direction", "towing_pressure"],
      confidence: "likely",
      next_action: "draft_response",
      ai_summary:
        "A communication asserting an unregistered rule and threatening enforcement within a 2-hour window.",
      ai_extracted_fields: null,
      created_at: daysAgo(12),
      updated_at: daysAgo(12),
    },
    {
      id: "e0000000-0000-0000-0000-000000000002",
      scheme_id: SCHEME_ID,
      uploaded_by: DEMO_USERS.owner.id,
      shared_with_scheme: false,
      occurred_at: daysAgo(8),
      occurred_at_approximate: false,
      location: "Building foyer",
      people_involved: [],
      source: "photo",
      file_url: null,
      thumbnail_url: null,
      description:
        "Signage posted in foyer stating all vehicles must reverse-park, without by-law reference.",
      exact_words: "ALL VEHICLES MUST REVERSE PARK — COMMITTEE RULE",
      rule_cited: "reverse-parking",
      rule_is_in_bylaws: false,
      rule_source: "signage",
      impact_flags: [],
      impact_notes: null,
      issue_flags: ["overreach", "signage_mismatch"],
      confidence: "confirmed",
      next_action: "include_in_timeline",
      ai_summary:
        "Signage in foyer asserts a rule not present in the registered by-laws.",
      ai_extracted_fields: null,
      created_at: daysAgo(8),
      updated_at: daysAgo(8),
    },
    {
      id: "e0000000-0000-0000-0000-000000000003",
      scheme_id: SCHEME_ID,
      uploaded_by: DEMO_USERS.tenant.id,
      shared_with_scheme: false,
      occurred_at: daysAgo(5),
      occurred_at_approximate: false,
      location: "Scheme Facebook group",
      people_involved: [],
      source: "facebook_post",
      file_url: null,
      thumbnail_url: null,
      description:
        "Public Facebook post referencing a resident by lot number and celebrating a tow.",
      exact_words: "Another one gone from Lot 12. Rules are rules folks!",
      rule_cited: null,
      rule_is_in_bylaws: null,
      rule_source: "facebook",
      impact_flags: ["embarrassment", "distress"],
      impact_notes: null,
      issue_flags: ["reputational_targeting", "intimidation"],
      confidence: "confirmed",
      next_action: "preserve_for_complaint_bundle",
      ai_summary:
        "A public post identifying a lot number in a way that may be reputationally harmful.",
      ai_extracted_fields: null,
      created_at: daysAgo(5),
      updated_at: daysAgo(5),
    },
    {
      id: "e0000000-0000-0000-0000-000000000004",
      scheme_id: SCHEME_ID,
      uploaded_by: DEMO_USERS.owner.id,
      shared_with_scheme: true,
      occurred_at: daysAgo(3),
      occurred_at_approximate: false,
      location: "Lot 12 letterbox",
      people_involved: [],
      source: "notice",
      file_url: null,
      thumbnail_url: null,
      description:
        "Written notice threatening fines for parking orientation not matching foyer signage.",
      exact_words: null,
      rule_cited: "foyer signage",
      rule_is_in_bylaws: false,
      rule_source: "signage",
      impact_flags: ["fear"],
      impact_notes: null,
      issue_flags: ["overreach", "procedural_defect"],
      confidence: "likely",
      next_action: "draft_response",
      ai_summary:
        "Threatened enforcement that references signage, not registered by-laws.",
      ai_extracted_fields: null,
      created_at: daysAgo(3),
      updated_at: daysAgo(3),
    },
    {
      id: "e0000000-0000-0000-0000-000000000005",
      scheme_id: SCHEME_ID,
      uploaded_by: DEMO_USERS.owner.id,
      shared_with_scheme: false,
      occurred_at: daysAgo(1),
      occurred_at_approximate: true,
      location: null,
      people_involved: [],
      source: "conversation",
      file_url: null,
      thumbnail_url: null,
      description:
        "Verbal conversation with committee member about monitoring vehicle movements via CCTV.",
      exact_words: null,
      rule_cited: null,
      rule_is_in_bylaws: null,
      rule_source: "verbal",
      impact_flags: ["anxiety", "fear"],
      impact_notes: null,
      issue_flags: ["privacy_concern"],
      confidence: "unclear",
      next_action: "seek_records",
      ai_summary:
        "Verbal disclosure of CCTV-based monitoring; records request recommended.",
      ai_extracted_fields: null,
      created_at: daysAgo(1),
      updated_at: daysAgo(1),
    },
  ];

  const communications: Communication[] = [
    {
      id: "k0000000-0000-0000-0000-000000000001",
      scheme_id: SCHEME_ID,
      thread_id: "t0000000-0000-0000-0000-000000000001",
      from_user: DEMO_USERS.owner.id,
      to_party: "committee",
      to_party_email: "committee@riverbend.test",
      stage: "stage_1_fyi",
      stage_skip_justification: null,
      subject: "FYI — Visitor parking enforcement clarification",
      body:
        "Hi committee,\n\nI wanted to flag some recent correspondence about visitor parking that references rules not present in the registered by-laws. I'm hoping we can clarify the basis for recent enforcement communications.\n\nHappy to chat.\n\nThis communication is made for the purpose of resolving a dispute and preserving the record.",
      bylaw_citations: ["12.3", "8.4"],
      related_evidence_ids: [
        "e0000000-0000-0000-0000-000000000001",
        "e0000000-0000-0000-0000-000000000002",
      ],
      status: "served",
      served_at: daysAgo(10),
      acknowledged_at: null,
      response_deadline: daysAgo(-4),
      responded_at: null,
      created_at: daysAgo(11),
      updated_at: daysAgo(10),
    },
    {
      id: "k0000000-0000-0000-0000-000000000002",
      scheme_id: SCHEME_ID,
      thread_id: "t0000000-0000-0000-0000-000000000001",
      from_user: DEMO_USERS.owner.id,
      to_party: "committee",
      to_party_email: "committee@riverbend.test",
      stage: "stage_2_formal_notice",
      stage_skip_justification: null,
      subject: "Formal Notice — Request for by-law basis of visitor parking enforcement",
      body:
        "Dear Committee,\n\nFurther to my Stage 1 FYI on 8 April, no response has been received. I now request a written response within 14 days setting out:\n\n1. The precise by-law, resolution, or lawful basis for recent enforcement communications about visitor parking.\n2. Any committee resolution authorising the 'reverse park' signage in the foyer.\n\nThis communication is made for the purpose of resolving a dispute and preserving the record.",
      bylaw_citations: ["12.3", "8.4"],
      related_evidence_ids: [
        "e0000000-0000-0000-0000-000000000001",
        "e0000000-0000-0000-0000-000000000002",
        "e0000000-0000-0000-0000-000000000004",
      ],
      status: "draft",
      served_at: null,
      acknowledged_at: null,
      response_deadline: null,
      responded_at: null,
      created_at: daysAgo(2),
      updated_at: daysAgo(2),
    },
  ];

  const records: RecordsRequest[] = [
    {
      id: "r0000000-0000-0000-0000-000000000001",
      scheme_id: SCHEME_ID,
      requester_id: DEMO_USERS.owner.id,
      request_type: ["minutes", "correspondence", "towing_records"],
      specific_items:
        "Committee minutes and correspondence related to visitor parking enforcement in Jan–Mar, including any instructions to contractors.",
      fee_acknowledged: true,
      submitted_at: daysAgo(4),
      served_at: daysAgo(4),
      statutory_deadline: daysAgo(-3),
      fulfilled_at: null,
      fulfilled_partial: false,
      status: "submitted",
      notes: null,
      created_at: daysAgo(5),
    },
  ];

  const impact: ImpactEntry[] = Array.from({ length: 14 }).map((_, i) => {
    const date = new Date(Date.now() - (13 - i) * 86_400_000);
    return {
      id: `i000000-0000-0000-0000-000000000${(i + 1).toString().padStart(3, "0")}`,
      user_id: DEMO_USERS.owner.id,
      scheme_id: SCHEME_ID,
      log_date: date.toISOString().slice(0, 10),
      bc_contact_occurred: i % 3 === 0,
      monitoring_observed: i % 5 === 0,
      signage_or_towing_pressure: i === 2 || i === 8,
      family_anxiety: i >= 10,
      avoidance_of_premises: i === 12,
      new_public_content: i === 9,
      new_evidence_captured: i === 1 || i === 8 || i === 12,
      anxiety_score: Math.min(10, 2 + Math.floor(Math.sin(i / 2) * 3) + (i >= 10 ? 3 : 0)),
      disturbance_score: Math.min(10, 1 + Math.floor(Math.cos(i / 3) * 2) + (i >= 10 ? 2 : 0)),
      summary:
        i === 12
          ? "New notice in letterbox. Spouse anxious; avoided using the garage today."
          : i === 8
          ? "Took photos of the new foyer signage."
          : null,
      legal_relevance: i >= 10 ? "high" : i >= 6 ? "medium" : "low",
      created_at: date.toISOString(),
    };
  });

  const issues: LegalIssue[] = [
    {
      id: "g0000000-0000-0000-0000-000000000001",
      scheme_id: SCHEME_ID,
      raised_by: DEMO_USERS.owner.id,
      issue_type: "overreach",
      headline: "Enforcement appears to rely on unregistered 'committee rules'",
      detail:
        "Multiple communications and notices cite committee rules or foyer signage as enforcement basis. Registered by-laws (12.3, 8.4) do not prescribe the positions asserted.",
      related_evidence_ids: [
        "e0000000-0000-0000-0000-000000000001",
        "e0000000-0000-0000-0000-000000000002",
        "e0000000-0000-0000-0000-000000000004",
      ],
      status: "open",
      confidence: "likely",
      next_step: "Serve Stage 2 Formal Notice requesting the by-law basis.",
      created_at: daysAgo(7),
      updated_at: daysAgo(7),
    },
    {
      id: "g0000000-0000-0000-0000-000000000002",
      scheme_id: SCHEME_ID,
      raised_by: DEMO_USERS.owner.id,
      issue_type: "reputational_targeting",
      headline: "Public identification of a resident in a scheme Facebook group",
      detail:
        "A public post identifying Lot 12 may expose the committee member to defamation risk and could form part of a harassment pattern.",
      related_evidence_ids: ["e0000000-0000-0000-0000-000000000003"],
      status: "open",
      confidence: "unclear",
      next_step: "Preserve the post. Consider raising under BCCM Commissioner dispute pathway if continues.",
      created_at: daysAgo(4),
      updated_at: daysAgo(4),
    },
  ];

  const chatSessions: ChatSession[] = [
    {
      id: "s0000000-0000-0000-0000-000000000001",
      user_id: DEMO_USERS.owner.id,
      scheme_id: SCHEME_ID,
      title: "Do I have to reverse park?",
      created_at: daysAgo(6),
    },
  ];

  const chatMessages: ChatMessage[] = [
    {
      id: "h0000000-0000-0000-0000-000000000001",
      session_id: chatSessions[0].id,
      role: "user",
      content: "Do I have to reverse park?",
      citations: null,
      created_at: daysAgo(6),
    },
    {
      id: "h0000000-0000-0000-0000-000000000002",
      session_id: chatSessions[0].id,
      role: "assistant",
      content:
        "No by-law in the uploaded registered by-laws prescribes a direction in which vehicles must be parked. By-law 8.4 notes that committee signage about reversing or head-in parking is for guidance only and does not itself constitute a contravention.\n\n[By-law 8.4, p.5]\n\nIf a committee direction or signage appears to go further than the registered by-laws, the registered by-laws remain the legally binding source. Committee statements that conflict with them may not be enforceable.\n\nThis is general information from your registered by-laws and Queensland legislation, not legal advice.",
      citations: [
        {
          bylaw_number: "8.4",
          page: 5,
          chunk_id: "c0000000-0000-0000-0000-000000000004",
        },
      ],
      created_at: daysAgo(6),
    },
  ];

  const audit: AuditLog[] = [
    { action: "scheme_created", entity_type: "schemes", entity_id: SCHEME_ID, user_id: DEMO_USERS.owner.id, scheme_id: SCHEME_ID, metadata: {}, created_at: daysAgo(90), id: "a1" } as AuditLog,
    { action: "bylaws_ingested", entity_type: "bylaws_documents", entity_id: DOC_ID, user_id: DEMO_USERS.owner.id, scheme_id: SCHEME_ID, metadata: { chunks: 4 }, created_at: daysAgo(89), id: "a2" } as AuditLog,
    { action: "evidence_created", entity_type: "evidence_items", entity_id: evidence[0].id, user_id: DEMO_USERS.owner.id, scheme_id: SCHEME_ID, metadata: {}, created_at: daysAgo(12), id: "a3" } as AuditLog,
    { action: "comms_served", entity_type: "communications", entity_id: communications[0].id, user_id: DEMO_USERS.owner.id, scheme_id: SCHEME_ID, metadata: { stage: "stage_1_fyi" }, created_at: daysAgo(10), id: "a4" } as AuditLog,
    { action: "records_submitted", entity_type: "records_requests", entity_id: records[0].id, user_id: DEMO_USERS.owner.id, scheme_id: SCHEME_ID, metadata: {}, created_at: daysAgo(4), id: "a5" } as AuditLog,
  ];

  return {
    users,
    schemes: [scheme],
    scheme_memberships: memberships,
    bylaws_documents: [doc],
    bylaws_chunks: chunks,
    evidence_items: evidence,
    communications,
    records_requests: records,
    impact_entries: impact,
    legal_issues: issues,
    chat_sessions: chatSessions,
    chat_messages: chatMessages,
    audit_log: audit,
  };
}

export function getDemoDB(): DemoDB {
  if (!globalThis.__parityDemoDB) {
    globalThis.__parityDemoDB = seed();
  }
  return globalThis.__parityDemoDB;
}

export function resetDemoDB() {
  globalThis.__parityDemoDB = seed();
}
