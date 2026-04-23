-- scheme_announcements (matches PATCH3_PHASE10 section 2 + announcement RLS)

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

alter table scheme_announcements enable row level security;

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
        and role in ('committee_chair', 'committee_member', 'manager')
    )
  );

drop policy if exists announcements_update on scheme_announcements;
create policy announcements_update on scheme_announcements for update
  using (posted_by = auth.uid());

drop policy if exists announcements_delete on scheme_announcements;
create policy announcements_delete on scheme_announcements for delete
  using (posted_by = auth.uid());