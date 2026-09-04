-- Roadmap item 1.3 — private bucket for Quick Capture Inbox attachments.
-- Objects are stored at "<account_id>/<filename>" so the same account_id
-- scoping used on every table can be enforced on storage.objects too, via
-- the is_account_member() helper already defined in the initial schema.
insert into storage.buckets (id, name, public)
values ('capture-attachments', 'capture-attachments', false)
on conflict (id) do nothing;

create policy "members can manage their capture attachments"
on storage.objects for all
using (
  bucket_id = 'capture-attachments'
  and is_account_member((storage.foldername(name))[1]::uuid)
)
with check (
  bucket_id = 'capture-attachments'
  and is_account_member((storage.foldername(name))[1]::uuid)
);
