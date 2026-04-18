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
