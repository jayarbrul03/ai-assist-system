-- Fix redirect loop: the membership select policy had a recursive subquery
-- that returns empty. Users couldn't read their own memberships, so every
-- page that checks "do you have a scheme?" redirected to onboarding, which
-- checked again and redirected to dashboard. Infinite loop.
--
-- Fix: simplest possible policy — users see only their own memberships.

drop policy if exists memberships_select_own on scheme_memberships;

create policy memberships_select_own on scheme_memberships for select
  using (user_id = auth.uid());

-- Same class of bug in other policies that use scheme_memberships subquery.
-- Those are fine because they reference OTHER tables, not self. Leaving.

-- Confirm by re-checking policies list (safe no-op).
select schemaname, tablename, policyname
from pg_policies
where tablename = 'scheme_memberships';
