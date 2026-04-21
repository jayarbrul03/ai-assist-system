-- PARITY PATCH — brings the simplified schema you just applied up to the full
-- Parity spec: extends enums, adds missing columns, sets up RLS, fixes the
-- match_bylaw_chunks RPC signature, creates storage buckets.
-- Safe to run multiple times.

begin;

-- ============================================================
-- 1. Extend enums with Parity values (ADD VALUE IF NOT EXISTS)
-- ============================================================

alter type scheme_role add value if not exists 'committee_member';
alter type scheme_role add value if not exists 'committee_chair';
alter type scheme_role add value if not exists 'manager';
alter type scheme_role add value if not exists 'observer';

alter type evidence_source add value if not exists 'screenshot';
alter type evidence_source add value if not exists 'sms';
alter type evidence_source add value if not exists 'notice';
alter type evidence_source add value if not exists 'photo';
alter type evidence_source add value if not exists 'video';
alter type evidence_source add value if not exists 'audio';
alter type evidence_source add value if not exists 'cctv';
alter type evidence_source add value if not exists 'facebook_post';
alter type evidence_source add value if not exists 'conversation';
alter type evidence_source add value if not exists 'witness_account';
alter type evidence_source add value if not exists 'note';

alter type confidence_level add value if not exists 'confirmed';
alter type confidence_level add value if not exists 'likely';
alter type confidence_level add value if not exists 'unclear';

alter type next_action add value if not exists 'file_only';
alter type next_action add value if not exists 'seek_records';
alter type next_action add value if not exists 'draft_response';
alter type next_action add value if not exists 'include_in_timeline';
alter type next_action add value if not exists 'preserve_for_complaint_bundle';

commit;

-- Enum values become available only after the transaction that added them
-- commits. Split into separate transaction so the rest of this script can
-- reference the new values.

begin;

-- ============================================================
-- 2. Extend tables with missing Parity columns
-- ============================================================

alter table schemes add column if not exists cms_number text;
alter table schemes add column if not exists cts_number text;
alter table schemes add column if not exists jurisdiction text default 'QLD';
alter table schemes add column if not exists governing_act text default 'BCCM 1997';
alter table schemes add column if not exists regulation_module text;
alter table schemes add column if not exists address text;
alter table schemes add column if not exists lot_count int;
alter table schemes add column if not exists onboarded_by uuid references auth.users(id);
alter table schemes add column if not exists updated_at timestamptz default now();

alter table scheme_memberships add column if not exists lot_number text;
alter table scheme_memberships add column if not exists verified boolean default false;

alter table bylaws_documents add column if not exists source_type text;
alter table bylaws_documents add column if not exists file_url text;
alter table bylaws_documents add column if not exists raw_text text;

alter table bylaws_chunks add column if not exists bylaw_number text;
alter table bylaws_chunks add column if not exists heading text;
alter table bylaws_chunks add column if not exists page_number int;

alter table evidence_items add column if not exists shared_with_scheme boolean default false;
alter table evidence_items add column if not exists occurred_at timestamptz;
alter table evidence_items add column if not exists occurred_at_approximate boolean default false;
alter table evidence_items add column if not exists location text;
alter table evidence_items add column if not exists people_involved text[] default '{}';
alter table evidence_items add column if not exists file_url text;
alter table evidence_items add column if not exists thumbnail_url text;
alter table evidence_items add column if not exists exact_words text;
alter table evidence_items add column if not exists rule_cited text;
alter table evidence_items add column if not exists rule_is_in_bylaws boolean;
alter table evidence_items add column if not exists rule_source text;
alter table evidence_items add column if not exists impact_flags text[] default '{}';
alter table evidence_items add column if not exists impact_notes text;
alter table evidence_items add column if not exists issue_flags text[] default '{}';
alter table evidence_items add column if not exists confidence confidence_level default 'unclear';
alter table evidence_items add column if not exists next_action next_action default 'file_only';
alter table evidence_items add column if not exists ai_summary text;
alter table evidence_items add column if not exists ai_extracted_fields jsonb;

alter table records_requests add column if not exists requester_id uuid references auth.users(id) on delete cascade;
alter table records_requests add column if not exists request_type text[] default '{}';
alter table records_requests add column if not exists specific_items text;
alter table records_requests add column if not exists fee_acknowledged boolean default false;
alter table records_requests add column if not exists submitted_at timestamptz;
alter table records_requests add column if not exists served_at timestamptz;
alter table records_requests add column if not exists statutory_deadline timestamptz;
alter table records_requests add column if not exists fulfilled_at timestamptz;
alter table records_requests add column if not exists fulfilled_partial boolean default false;
alter table records_requests add column if not exists notes text;
-- Backfill requester_id from requested_by if both exist
update records_requests set requester_id = requested_by where requester_id is null and requested_by is not null;

alter table impact_entries add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table impact_entries add column if not exists log_date date;
alter table impact_entries add column if not exists bc_contact_occurred boolean default false;
alter table impact_entries add column if not exists monitoring_observed boolean default false;
alter table impact_entries add column if not exists signage_or_towing_pressure boolean default false;
alter table impact_entries add column if not exists family_anxiety boolean default false;
alter table impact_entries add column if not exists avoidance_of_premises boolean default false;
alter table impact_entries add column if not exists new_public_content boolean default false;
alter table impact_entries add column if not exists new_evidence_captured boolean default false;
alter table impact_entries add column if not exists anxiety_score int;
alter table impact_entries add column if not exists disturbance_score int;
alter table impact_entries add column if not exists summary text;
alter table impact_entries add column if not exists legal_relevance text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'impact_entries_user_scheme_date_unique') then
    alter table impact_entries add constraint impact_entries_user_scheme_date_unique unique (user_id, scheme_id, log_date);
  end if;
end $$;

alter table legal_issues add column if not exists raised_by uuid references auth.users(id);
alter table legal_issues add column if not exists issue_type text;
alter table legal_issues add column if not exists headline text;
alter table legal_issues add column if not exists detail text;
alter table legal_issues add column if not exists related_evidence_ids uuid[] default '{}';
alter table legal_issues add column if not exists status text default 'open';
alter table legal_issues add column if not exists next_step text;
alter table legal_issues add column if not exists updated_at timestamptz default now();

alter table audit_log add column if not exists user_id uuid references auth.users(id);
-- Backfill user_id from actor_user_id
update audit_log set user_id = actor_user_id where user_id is null and actor_user_id is not null;

alter table chat_messages add column if not exists citations jsonb;

-- Ensure evidence_items has updated_at
alter table evidence_items add column if not exists updated_at timestamptz default now();

-- ============================================================
-- 3. HNSW index for pgvector
-- ============================================================

create index if not exists bylaws_chunks_embedding_idx
  on bylaws_chunks using hnsw (embedding vector_cosine_ops);

-- ============================================================
-- 4. Fix match_bylaw_chunks RPC signature (my code expects match_scheme_id,
-- not filter_scheme_id, and needs bylaw_number / heading / page_number in
-- the return)
-- ============================================================

drop function if exists match_bylaw_chunks(vector, uuid, float, int);

create or replace function match_bylaw_chunks(
  query_embedding vector(1024),
  match_scheme_id uuid,
  match_threshold float default 0.7,
  match_count int default 5
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
    bc.id,
    bc.document_id,
    bc.scheme_id,
    bc.bylaw_number,
    bc.heading,
    bc.content,
    bc.page_number,
    1 - (bc.embedding <=> query_embedding) as similarity
  from bylaws_chunks bc
  where bc.scheme_id = match_scheme_id
    and bc.embedding is not null
    and (1 - (bc.embedding <=> query_embedding)) >= match_threshold
  order by bc.embedding <=> query_embedding
  limit match_count;
$$;

-- ============================================================
-- 5. Row-level security (critical)
-- ============================================================

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

-- Drop and recreate policies (idempotent)
drop policy if exists schemes_select on schemes;
drop policy if exists schemes_insert on schemes;
drop policy if exists schemes_update on schemes;

create policy schemes_select on schemes for select
  using (id in (select scheme_id from scheme_memberships where user_id = auth.uid()));
create policy schemes_insert on schemes for insert
  with check (onboarded_by = auth.uid() or created_by = auth.uid());
create policy schemes_update on schemes for update
  using (id in (
    select scheme_id from scheme_memberships
    where user_id = auth.uid()
      and role in ('committee_chair','manager','committee_member')
  ));

drop policy if exists memberships_select_own on scheme_memberships;
drop policy if exists memberships_insert_self on scheme_memberships;
drop policy if exists memberships_update_self on scheme_memberships;
drop policy if exists memberships_delete_self on scheme_memberships;
create policy memberships_select_own on scheme_memberships for select
  using (user_id = auth.uid()
    or scheme_id in (select scheme_id from scheme_memberships where user_id = auth.uid()));
create policy memberships_insert_self on scheme_memberships for insert
  with check (user_id = auth.uid());
create policy memberships_update_self on scheme_memberships for update using (user_id = auth.uid());
create policy memberships_delete_self on scheme_memberships for delete using (user_id = auth.uid());

drop policy if exists bylaws_docs_select on bylaws_documents;
drop policy if exists bylaws_docs_insert on bylaws_documents;
drop policy if exists bylaws_docs_update on bylaws_documents;
create policy bylaws_docs_select on bylaws_documents for select
  using (scheme_id in (select scheme_id from scheme_memberships where user_id = auth.uid()));
create policy bylaws_docs_insert on bylaws_documents for insert
  with check (uploaded_by = auth.uid()
    and scheme_id in (select scheme_id from scheme_memberships where user_id = auth.uid()));
create policy bylaws_docs_update on bylaws_documents for update using (uploaded_by = auth.uid());

drop policy if exists bylaws_chunks_select on bylaws_chunks;
drop policy if exists bylaws_chunks_insert on bylaws_chunks;
create policy bylaws_chunks_select on bylaws_chunks for select
  using (scheme_id in (select scheme_id from scheme_memberships where user_id = auth.uid()));
create policy bylaws_chunks_insert on bylaws_chunks for insert
  with check (scheme_id in (select scheme_id from scheme_memberships where user_id = auth.uid()));

drop policy if exists evidence_select on evidence_items;
drop policy if exists evidence_insert on evidence_items;
drop policy if exists evidence_update on evidence_items;
drop policy if exists evidence_delete on evidence_items;
create policy evidence_select on evidence_items for select
  using (
    uploaded_by = auth.uid()
    or (
      shared_with_scheme = true
      and scheme_id in (select scheme_id from scheme_memberships where user_id = auth.uid())
    )
  );
create policy evidence_insert on evidence_items for insert with check (uploaded_by = auth.uid());
create policy evidence_update on evidence_items for update using (uploaded_by = auth.uid());
create policy evidence_delete on evidence_items for delete using (uploaded_by = auth.uid());

drop policy if exists comms_select on communications;
drop policy if exists comms_insert on communications;
drop policy if exists comms_update on communications;
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
create policy comms_update on communications for update using (from_user = auth.uid());

drop policy if exists records_select on records_requests;
drop policy if exists records_insert on records_requests;
drop policy if exists records_update on records_requests;
create policy records_select on records_requests for select
  using (
    requester_id = auth.uid()
    or requested_by = auth.uid()
    or scheme_id in (
      select scheme_id from scheme_memberships
      where user_id = auth.uid()
        and role in ('committee_chair','committee_member','manager')
    )
  );
create policy records_insert on records_requests for insert with check (requester_id = auth.uid() or requested_by = auth.uid());
create policy records_update on records_requests for update using (requester_id = auth.uid() or requested_by = auth.uid());

drop policy if exists impact_select on impact_entries;
drop policy if exists impact_insert on impact_entries;
drop policy if exists impact_update on impact_entries;
drop policy if exists impact_delete on impact_entries;
create policy impact_select on impact_entries for select using (user_id = auth.uid());
create policy impact_insert on impact_entries for insert with check (user_id = auth.uid());
create policy impact_update on impact_entries for update using (user_id = auth.uid());
create policy impact_delete on impact_entries for delete using (user_id = auth.uid());

drop policy if exists issues_select on legal_issues;
drop policy if exists issues_insert on legal_issues;
drop policy if exists issues_update on legal_issues;
create policy issues_select on legal_issues for select
  using (
    raised_by = auth.uid()
    or scheme_id in (
      select scheme_id from scheme_memberships
      where user_id = auth.uid()
        and role in ('committee_chair','committee_member','manager')
    )
  );
create policy issues_insert on legal_issues for insert with check (raised_by = auth.uid());
create policy issues_update on legal_issues for update using (raised_by = auth.uid());

drop policy if exists chat_sessions_select on chat_sessions;
drop policy if exists chat_sessions_insert on chat_sessions;
drop policy if exists chat_sessions_update on chat_sessions;
drop policy if exists chat_sessions_delete on chat_sessions;
create policy chat_sessions_select on chat_sessions for select using (user_id = auth.uid());
create policy chat_sessions_insert on chat_sessions for insert with check (user_id = auth.uid());
create policy chat_sessions_update on chat_sessions for update using (user_id = auth.uid());
create policy chat_sessions_delete on chat_sessions for delete using (user_id = auth.uid());

drop policy if exists chat_messages_select on chat_messages;
drop policy if exists chat_messages_insert on chat_messages;
create policy chat_messages_select on chat_messages for select
  using (session_id in (select id from chat_sessions where user_id = auth.uid()));
create policy chat_messages_insert on chat_messages for insert
  with check (session_id in (select id from chat_sessions where user_id = auth.uid()));

drop policy if exists audit_select on audit_log;
drop policy if exists audit_insert on audit_log;
create policy audit_select on audit_log for select using (user_id = auth.uid() or actor_user_id = auth.uid());
create policy audit_insert on audit_log for insert with check (
  user_id = auth.uid() or actor_user_id = auth.uid() or user_id is null
);

-- ============================================================
-- 6. Storage buckets + policies
-- ============================================================

insert into storage.buckets (id, name, public)
values ('bylaws', 'bylaws', false), ('evidence', 'evidence', false)
on conflict (id) do nothing;

drop policy if exists "bylaws read own scheme" on storage.objects;
drop policy if exists "bylaws upload own scheme" on storage.objects;
drop policy if exists "evidence read own uploads" on storage.objects;
drop policy if exists "evidence upload own" on storage.objects;

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
  with check (bucket_id = 'evidence' and owner = auth.uid());

commit;
