-- PHASE 10 — Communications portal v2 + investigation download + consent defaults.
-- Safe to run multiple times. In-app features only — no email / push infra.

begin;

-- =============================================================
-- 1. Per-member investigation consent default
-- =============================================================
do $$ begin
  if not exists (select 1 from pg_type where typname = 'investigation_default') then
    create type investigation_default as enum ('ask', 'fast_release', 'refuse');
  end if;
end $$;

alter table scheme_memberships
  add column if not exists investigation_default_policy investigation_default default 'ask';

-- =============================================================
-- 2. Scheme announcements (in-app only, committee / manager posts)
-- =============================================================
do $$ begin
  if not exists (select 1 from pg_type where typname = 'announcement_tone') then
    create type announcement_tone as enum ('positive', 'info', 'meeting', 'reminder', 'urgent');
  end if;
end $$;

create table if not exists scheme_announcements (
  id uuid primary key default uuid_generate_v4(),
  scheme_id uuid not null references schemes(id) on delete cascade,
  posted_by uuid references auth.users(id) on delete set null,
  title text not null,
  body text not null,
  tone announcement_tone not null default 'info',
  pinned boolean default false,
  published_at timestamptz default now(),
  ai_reviewed boolean default false,
  ai_review_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists scheme_announcements_scheme_idx
  on scheme_announcements(scheme_id, published_at desc);

-- =============================================================
-- 3. Investigation requests + per-member consent records
-- =============================================================
do $$ begin
  if not exists (select 1 from pg_type where typname = 'investigation_basis') then
    create type investigation_basis as enum (
      'bccm_commissioner_dispute',
      'insurance_claim',
      'regulatory_inquiry',
      'internal_review',
      'other'
    );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'investigation_status') then
    create type investigation_status as enum ('open', 'ready', 'completed', 'cancelled');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'consent_response') then
    create type consent_response as enum (
      'pending', 'released', 'released_redacted', 'refused', 'expired', 'auto_released'
    );
  end if;
end $$;

create table if not exists investigation_requests (
  id uuid primary key default uuid_generate_v4(),
  scheme_id uuid not null references schemes(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  basis investigation_basis not null,
  basis_detail text,
  scope_from date,
  scope_to date,
  status investigation_status not null default 'open',
  expires_at timestamptz default (now() + interval '7 days'),
  tier1_snapshot_count int default 0,
  tier2_snapshot_count int default 0,
  tier3_pending_count int default 0,
  tier3_released_count int default 0,
  tier3_refused_count int default 0,
  export_generated_at timestamptz,
  export_file_path text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists investigation_requests_scheme_idx
  on investigation_requests(scheme_id, created_at desc);

create table if not exists investigation_consents (
  id uuid primary key default uuid_generate_v4(),
  investigation_id uuid not null references investigation_requests(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  scheme_id uuid not null references schemes(id) on delete cascade,
  response consent_response not null default 'pending',
  redaction_notes text,
  responded_at timestamptz,
  created_at timestamptz default now(),
  unique(investigation_id, member_id)
);
create index if not exists investigation_consents_member_idx
  on investigation_consents(member_id, response);

-- =============================================================
-- 4. Data export log — tracks every "my data" / investigation download
-- =============================================================
create table if not exists data_export_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  scheme_id uuid references schemes(id) on delete cascade,
  investigation_id uuid references investigation_requests(id) on delete set null,
  export_type text not null,  -- 'personal_pdf' | 'personal_json' | 'investigation_bundle'
  tiers text[] default '{}',  -- e.g. ['1','2']
  metadata jsonb,
  created_at timestamptz default now()
);
create index if not exists data_export_log_user_idx
  on data_export_log(user_id, created_at desc);
create index if not exists data_export_log_scheme_idx
  on data_export_log(scheme_id, created_at desc);

-- =============================================================
-- 5. AI review log per communication (before-send diff storage)
-- =============================================================
alter table communications add column if not exists ai_reviewed boolean default false;
alter table communications add column if not exists ai_review_risk text;  -- low | medium | high
alter table communications add column if not exists ai_review_notes text;
alter table communications add column if not exists original_body text;  -- pre-AI-sanitisation

-- =============================================================
-- 6. RLS
-- =============================================================
alter table scheme_announcements enable row level security;
alter table investigation_requests enable row level security;
alter table investigation_consents enable row level security;
alter table data_export_log enable row level security;

-- Announcements: any scheme member can read; only leadership can write.
drop policy if exists announcements_select on scheme_announcements;
create policy announcements_select on scheme_announcements for select
  using (scheme_id in (select scheme_id from scheme_memberships where user_id = auth.uid()));

drop policy if exists announcements_insert on scheme_announcements;
create policy announcements_insert on scheme_announcements for insert
  with check (
    posted_by = auth.uid()
    and scheme_id in (
      select scheme_id from scheme_memberships
      where user_id = auth.uid()
        and role in ('committee_chair','committee_member','manager')
    )
  );

drop policy if exists announcements_update on scheme_announcements;
create policy announcements_update on scheme_announcements for update
  using (posted_by = auth.uid());

drop policy if exists announcements_delete on scheme_announcements;
create policy announcements_delete on scheme_announcements for delete
  using (posted_by = auth.uid());

-- Investigation requests: requester can see own, scheme leadership can see scheme-wide.
drop policy if exists inv_requests_select on investigation_requests;
create policy inv_requests_select on investigation_requests for select
  using (
    requested_by = auth.uid()
    or scheme_id in (
      select scheme_id from scheme_memberships
      where user_id = auth.uid()
        and role in ('committee_chair','committee_member','manager')
    )
  );

drop policy if exists inv_requests_insert on investigation_requests;
create policy inv_requests_insert on investigation_requests for insert
  with check (
    requested_by = auth.uid()
    and scheme_id in (
      select scheme_id from scheme_memberships
      where user_id = auth.uid()
        and role in ('committee_chair','committee_member','manager')
    )
  );

drop policy if exists inv_requests_update on investigation_requests;
create policy inv_requests_update on investigation_requests for update
  using (requested_by = auth.uid());

-- Investigation consents: member can see / update own. Requester can read aggregated but not identity.
drop policy if exists inv_consents_select_own on investigation_consents;
create policy inv_consents_select_own on investigation_consents for select
  using (member_id = auth.uid());

drop policy if exists inv_consents_insert on investigation_consents;
create policy inv_consents_insert on investigation_consents for insert
  with check (
    -- Only the system (service role) should insert these, but allow member
    -- to create their own for manual opt-in scenarios.
    member_id = auth.uid()
  );

drop policy if exists inv_consents_update on investigation_consents;
create policy inv_consents_update on investigation_consents for update
  using (member_id = auth.uid());

-- Data export log: user can see their own exports.
drop policy if exists data_export_select on data_export_log;
create policy data_export_select on data_export_log for select
  using (user_id = auth.uid());

drop policy if exists data_export_insert on data_export_log;
create policy data_export_insert on data_export_log for insert
  with check (user_id = auth.uid() or user_id is null);

commit;
