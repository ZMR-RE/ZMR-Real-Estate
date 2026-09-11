-- Document Storage Architecture (Roadmap item 2.5) — native Supabase
-- Storage. One row per stored file, with an optional link to whichever
-- entity it belongs to (transaction / lease / mortgage) plus a category
-- matching the 8.1 document-type pick-list values.
--
-- unit_id and lease_id are plain nullable uuid columns with no FK yet —
-- Units (7.2) and Lease (8.5) aren't real linked-record tables yet, so
-- there's nothing to reference. FKs get added once those land.
--
-- property_id is nullable per spec (an account-level document with no
-- single property isn't ruled out), but the only creation path today
-- (2.6's reconcile-to-Documents move) always has a property, since
-- capture_log.property_id is itself not null.
create table documents (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  unit_id uuid,
  category text not null check (category in (
    'Leases', 'Insurance', 'Tax Documents', 'Receipts', 'Mortgage Documents', 'Photos', 'Other'
  )),
  transaction_id uuid references financial_transactions(id) on delete set null,
  lease_id uuid,
  mortgage_id uuid references mortgage_details(id) on delete set null,
  uploaded_by uuid references auth.users(id),
  uploaded_at timestamptz not null default now(),
  storage_path text not null unique,
  file_size bigint not null check (file_size >= 0),
  created_at timestamptz not null default now()
);

create index documents_account_property_idx on documents (account_id, property_id);

alter table documents enable row level security;

create policy "members can manage their documents"
  on documents for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

-- Private bucket for permanent document storage. Objects are stored at
-- "<account_id>/<property_id>/<category>/<filename>" (roadmap 2.5) —
-- account_id is always the first path segment, same convention as the
-- capture-attachments bucket (item 1.3), so the same storage.foldername()
-- RLS check applies here, enforced at the storage layer itself — not just
-- application code.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "members can manage their documents storage"
on storage.objects for all
using (
  bucket_id = 'documents'
  and is_account_member((storage.foldername(name))[1]::uuid)
)
with check (
  bucket_id = 'documents'
  and is_account_member((storage.foldername(name))[1]::uuid)
);
