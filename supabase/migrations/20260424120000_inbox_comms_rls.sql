-- Inbox: leadership (committee + manager) can read inbound comms addressed to committee OR manager.
-- Drop previous comms_select and replace (same manager/committee access for both to_party values).

drop policy if exists comms_select on communications;

create policy comms_select on communications for select
  using (
    from_user = auth.uid()
    or (
      to_party in ('committee', 'manager')
      and scheme_id in (
        select scheme_id from scheme_memberships
        where user_id = auth.uid()
          and role in ('committee_chair', 'committee_member', 'manager')
      )
    )
  );
