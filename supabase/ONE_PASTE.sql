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
-- Row-Level Security — the RLS policies ARE the product.
-- Default private on every table. Membership-scoped reads where appropriate.

alter table schemes enable row level security;
alter table scheme_memberships enable row level security;
alter table bylaws_documents enable row level security;
alter table bylaws_chunks enable row level security;
alter table evidence_items enable row level security;
alter table communications enable row level security;
alter table records_requests enable row level security;
alter table impact_entries enable row level security;
alter table legal_issues enable row level security;
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;
alter table audit_log enable row level security;

-- ============================================================
-- SCHEMES — readable by members; writable by onboarder
-- ============================================================
create policy schemes_select on schemes for select
  using (id in (select scheme_id from scheme_memberships where user_id = auth.uid()));

create policy schemes_insert on schemes for insert
  with check (onboarded_by = auth.uid());

create policy schemes_update on schemes for update
  using (id in (
    select scheme_id from scheme_memberships
    where user_id = auth.uid()
      and role in ('committee_chair','manager','committee_member')
  ));

-- ============================================================
-- SCHEME_MEMBERSHIPS — users see own rows and rows in their schemes
-- ============================================================
create policy memberships_select_own on scheme_memberships for select
  using (user_id = auth.uid()
    or scheme_id in (select scheme_id from scheme_memberships where user_id = auth.uid()));

create policy memberships_insert_self on scheme_memberships for insert
  with check (user_id = auth.uid());

create policy memberships_update_self on scheme_memberships for update
  using (user_id = auth.uid());

create policy memberships_delete_self on scheme_memberships for delete
  using (user_id = auth.uid());

-- ============================================================
-- BY-LAWS — scheme-scoped read for any member, write by uploader
-- ============================================================
create policy bylaws_docs_select on bylaws_documents for select
  using (scheme_id in (select scheme_id from scheme_memberships where user_id = auth.uid()));

create policy bylaws_docs_insert on bylaws_documents for insert
  with check (uploaded_by = auth.uid()
    and scheme_id in (select scheme_id from scheme_memberships where user_id = auth.uid()));

create policy bylaws_docs_update on bylaws_documents for update
  using (uploaded_by = auth.uid());

create policy bylaws_chunks_select on bylaws_chunks for select
  using (scheme_id in (select scheme_id from scheme_memberships where user_id = auth.uid()));

create policy bylaws_chunks_insert on bylaws_chunks for insert
  with check (scheme_id in (select scheme_id from scheme_memberships where user_id = auth.uid()));

-- ============================================================
-- EVIDENCE ITEMS — default PRIVATE to uploader. Shared only if opted in.
-- ============================================================
create policy evidence_select on evidence_items for select
  using (
    uploaded_by = auth.uid()
    or (
      shared_with_scheme = true
      and scheme_id in (select scheme_id from scheme_memberships where user_id = auth.uid())
    )
  );

create policy evidence_insert on evidence_items for insert
  with check (uploaded_by = auth.uid());

create policy evidence_update on evidence_items for update
  using (uploaded_by = auth.uid());

create policy evidence_delete on evidence_items for delete
  using (uploaded_by = auth.uid());

-- ============================================================
-- COMMUNICATIONS — sender sees all their comms
--   Committee/manager members see comms addressed to 'committee'
-- ============================================================
create policy comms_select on communications for select
  using (
    from_user = auth.uid()
    or (
      to_party = 'committee'
      and scheme_id in (
        select scheme_id from scheme_memberships
        where user_id = auth.uid()
          and role in ('committee_chair','committee_member','manager')
      )
    )
  );

create policy comms_insert on communications for insert
  with check (from_user = auth.uid()
    and scheme_id in (select scheme_id from scheme_memberships where user_id = auth.uid()));

create policy comms_update on communications for update
  using (from_user = auth.uid());

-- ============================================================
-- RECORDS REQUESTS — requester owns, committee sees scheme-scoped
-- ============================================================
create policy records_select on records_requests for select
  using (
    requester_id = auth.uid()
    or scheme_id in (
      select scheme_id from scheme_memberships
      where user_id = auth.uid()
        and role in ('committee_chair','committee_member','manager')
    )
  );

create policy records_insert on records_requests for insert
  with check (requester_id = auth.uid());

create policy records_update on records_requests for update
  using (requester_id = auth.uid());

-- ============================================================
-- IMPACT ENTRIES — strictly private to the user
-- ============================================================
create policy impact_select on impact_entries for select using (user_id = auth.uid());
create policy impact_insert on impact_entries for insert with check (user_id = auth.uid());
create policy impact_update on impact_entries for update using (user_id = auth.uid());
create policy impact_delete on impact_entries for delete using (user_id = auth.uid());

-- ============================================================
-- LEGAL ISSUES — raiser owns; shared if evidence is shared
-- ============================================================
create policy issues_select on legal_issues for select
  using (
    raised_by = auth.uid()
    or scheme_id in (
      select scheme_id from scheme_memberships
      where user_id = auth.uid()
        and role in ('committee_chair','committee_member','manager')
    )
  );

create policy issues_insert on legal_issues for insert
  with check (raised_by = auth.uid());

create policy issues_update on legal_issues for update
  using (raised_by = auth.uid());

-- ============================================================
-- CHAT — strictly private per user
-- ============================================================
create policy chat_sessions_select on chat_sessions for select using (user_id = auth.uid());
create policy chat_sessions_insert on chat_sessions for insert with check (user_id = auth.uid());
create policy chat_sessions_update on chat_sessions for update using (user_id = auth.uid());
create policy chat_sessions_delete on chat_sessions for delete using (user_id = auth.uid());

create policy chat_messages_select on chat_messages for select
  using (session_id in (select id from chat_sessions where user_id = auth.uid()));
create policy chat_messages_insert on chat_messages for insert
  with check (session_id in (select id from chat_sessions where user_id = auth.uid()));

-- ============================================================
-- AUDIT LOG — write-only for users; read restricted to self
-- ============================================================
create policy audit_select on audit_log for select using (user_id = auth.uid());
create policy audit_insert on audit_log for insert with check (user_id = auth.uid() or user_id is null);
-- Storage buckets. Execute after core auth is live.

insert into storage.buckets (id, name, public)
values
  ('bylaws', 'bylaws', false),
  ('evidence', 'evidence', false)
on conflict (id) do nothing;

-- Policies: users can upload/read only inside their scheme folders.
-- Folder convention: <bucket>/<scheme_id>/<file>

create policy "bylaws read own scheme"
  on storage.objects for select
  using (
    bucket_id = 'bylaws'
    and (storage.foldername(name))[1]::uuid in (
      select scheme_id from scheme_memberships where user_id = auth.uid()
    )
  );

create policy "bylaws upload own scheme"
  on storage.objects for insert
  with check (
    bucket_id = 'bylaws'
    and (storage.foldername(name))[1]::uuid in (
      select scheme_id from scheme_memberships where user_id = auth.uid()
    )
  );

create policy "evidence read own uploads"
  on storage.objects for select
  using (
    bucket_id = 'evidence'
    and (
      owner = auth.uid()
      or (storage.foldername(name))[1]::uuid in (
        select scheme_id from scheme_memberships where user_id = auth.uid()
      )
    )
  );

create policy "evidence upload own"
  on storage.objects for insert
  with check (
    bucket_id = 'evidence'
    and owner = auth.uid()
  );
