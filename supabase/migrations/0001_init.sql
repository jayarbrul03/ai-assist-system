-- Parity initial schema
-- Jurisdiction: QLD BCCM Act 1997
-- Residency: ap-southeast-2 (Sydney)

create extension if not exists "uuid-ossp";
create extension if not exists "vector";

-- ============================================================
-- ENUMS
-- ============================================================

create type scheme_role as enum (
  'owner','tenant','committee_member','committee_chair','manager','observer'
);

create type evidence_source as enum (
  'screenshot','email','sms','notice','photo','video','audio','cctv',
  'facebook_post','conversation','witness_account','note'
);

create type confidence_level as enum ('confirmed','likely','unclear');

create type next_action as enum (
  'file_only','seek_records','draft_response','legal_review',
  'include_in_timeline','preserve_for_complaint_bundle'
);

create type comms_stage as enum (
  'stage_1_fyi','stage_2_formal_notice','stage_3_contravention_notice','stage_4_enforcement'
);

create type comms_status as enum (
  'draft','served','acknowledged','responded','resolved','escalated'
);

-- ============================================================
-- TABLES
-- ============================================================

create table schemes (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  cms_number text,
  cts_number text,
  jurisdiction text not null default 'QLD',
  governing_act text not null default 'BCCM 1997',
  regulation_module text,
  address text,
  lot_count int,
  onboarded_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table scheme_memberships (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  scheme_id uuid references schemes(id) on delete cascade,
  role scheme_role not null,
  lot_number text,
  verified boolean default false,
  created_at timestamptz default now(),
  unique (user_id, scheme_id)
);

create table bylaws_documents (
  id uuid primary key default uuid_generate_v4(),
  scheme_id uuid references schemes(id) on delete cascade,
  title text not null,
  source_type text,
  file_url text,
  raw_text text,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table bylaws_chunks (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid references bylaws_documents(id) on delete cascade,
  scheme_id uuid references schemes(id) on delete cascade,
  chunk_index int,
  bylaw_number text,
  heading text,
  content text not null,
  embedding vector(1024),
  page_number int,
  created_at timestamptz default now()
);
create index bylaws_chunks_embedding_idx
  on bylaws_chunks using hnsw (embedding vector_cosine_ops);
create index bylaws_chunks_scheme_idx on bylaws_chunks(scheme_id);

create table evidence_items (
  id uuid primary key default uuid_generate_v4(),
  scheme_id uuid references schemes(id) on delete cascade,
  uploaded_by uuid references auth.users(id) on delete cascade,
  shared_with_scheme boolean default false,
  occurred_at timestamptz,
  occurred_at_approximate boolean default false,
  location text,
  people_involved text[] default '{}',
  source evidence_source,
  file_url text,
  thumbnail_url text,
  description text,
  exact_words text,
  rule_cited text,
  rule_is_in_bylaws boolean,
  rule_source text,
  impact_flags text[] default '{}',
  impact_notes text,
  issue_flags text[] default '{}',
  confidence confidence_level default 'unclear',
  next_action next_action default 'file_only',
  ai_summary text,
  ai_extracted_fields jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index evidence_items_scheme_idx on evidence_items(scheme_id);
create index evidence_items_uploader_idx on evidence_items(uploaded_by);
create index evidence_items_occurred_idx on evidence_items(occurred_at desc);

create table communications (
  id uuid primary key default uuid_generate_v4(),
  scheme_id uuid references schemes(id) on delete cascade,
  thread_id uuid,
  from_user uuid references auth.users(id) on delete cascade,
  to_party text,
  to_party_email text,
  stage comms_stage,
  stage_skip_justification text,
  subject text,
  body text,
  bylaw_citations text[] default '{}',
  related_evidence_ids uuid[] default '{}',
  status comms_status default 'draft',
  served_at timestamptz,
  acknowledged_at timestamptz,
  response_deadline timestamptz,
  responded_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index communications_scheme_idx on communications(scheme_id);
create index communications_thread_idx on communications(thread_id);

create table records_requests (
  id uuid primary key default uuid_generate_v4(),
  scheme_id uuid references schemes(id) on delete cascade,
  requester_id uuid references auth.users(id) on delete cascade,
  request_type text[] default '{}',
  specific_items text,
  fee_acknowledged boolean default false,
  submitted_at timestamptz,
  served_at timestamptz,
  statutory_deadline timestamptz,
  fulfilled_at timestamptz,
  fulfilled_partial boolean default false,
  status text default 'draft',
  notes text,
  created_at timestamptz default now()
);
create index records_requests_scheme_idx on records_requests(scheme_id);

create table impact_entries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  scheme_id uuid references schemes(id) on delete cascade,
  log_date date not null,
  bc_contact_occurred boolean default false,
  monitoring_observed boolean default false,
  signage_or_towing_pressure boolean default false,
  family_anxiety boolean default false,
  avoidance_of_premises boolean default false,
  new_public_content boolean default false,
  new_evidence_captured boolean default false,
  anxiety_score int check (anxiety_score between 0 and 10),
  disturbance_score int check (disturbance_score between 0 and 10),
  summary text,
  legal_relevance text,
  created_at timestamptz default now(),
  unique(user_id, scheme_id, log_date)
);

create table legal_issues (
  id uuid primary key default uuid_generate_v4(),
  scheme_id uuid references schemes(id) on delete cascade,
  raised_by uuid references auth.users(id),
  issue_type text,
  headline text,
  detail text,
  related_evidence_ids uuid[] default '{}',
  status text default 'open',
  confidence confidence_level default 'unclear',
  next_step text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table chat_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  scheme_id uuid references schemes(id) on delete cascade,
  title text,
  created_at timestamptz default now()
);

create table chat_messages (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references chat_sessions(id) on delete cascade,
  role text check (role in ('user','assistant','system')),
  content text,
  citations jsonb,
  created_at timestamptz default now()
);

create table audit_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id),
  scheme_id uuid references schemes(id),
  action text,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz default now()
);
create index audit_log_user_idx on audit_log(user_id, created_at desc);
create index audit_log_scheme_idx on audit_log(scheme_id, created_at desc);

-- ============================================================
-- VECTOR SEARCH RPC
-- ============================================================

create or replace function match_bylaw_chunks(
  query_embedding vector(1024),
  match_scheme_id uuid,
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  document_id uuid,
  scheme_id uuid,
  bylaw_number text,
  heading text,
  content text,
  page_number int,
  similarity float
)
language sql stable
as $$
  select
    c.id,
    c.document_id,
    c.scheme_id,
    c.bylaw_number,
    c.heading,
    c.content,
    c.page_number,
    1 - (c.embedding <=> query_embedding) as similarity
  from bylaws_chunks c
  where c.scheme_id = match_scheme_id
    and 1 - (c.embedding <=> query_embedding) > match_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
