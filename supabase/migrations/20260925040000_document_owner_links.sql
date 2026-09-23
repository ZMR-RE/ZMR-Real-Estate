-- O1-A ownership foundation — a document may now be relevant to more than
-- one owning entity (a closing disclosure shared by two co-owners), which
-- a single nullable documents.llc_id column cannot express. Modeled as a
-- join table rather than widening documents itself, following the
-- established "one document row, many per-parent-FK relationships"
-- pattern this table already uses for property_id/transaction_id/
-- tenant_id/lease_id/etc. (each a plain nullable FK on documents), except
-- here the relationship is genuinely many-to-many on the entity side.
--
-- documents.property_id (existing, singular) is unchanged — nothing in
-- this batch asks for a document to belong to more than one property,
-- only to more than one entity.
create table document_owner_links (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  llc_id uuid not null references llcs(id) on delete cascade,
  linked_by uuid references auth.users(id),
  linked_at timestamptz not null default now(),
  unique (document_id, llc_id)
);

create index document_owner_links_document_idx on document_owner_links (account_id, document_id);
create index document_owner_links_llc_idx on document_owner_links (account_id, llc_id);

alter table document_owner_links enable row level security;
create policy "members can manage their document owner links"
  on document_owner_links for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

-- Uploading one closing disclosure and linking it to two co-owning
-- entities is one documents row plus two document_owner_links rows —
-- never two uploads, never a per-owner split/redacted copy. Linking is
-- always an explicit, separate user action: creating a document_owner_links
-- row never happens as a side effect of creating a property_ownership_interests
-- row, and vice versa — being a title owner does not automatically attach
-- every one of a property's existing documents to that owner's profile.
