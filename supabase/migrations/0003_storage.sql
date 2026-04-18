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
