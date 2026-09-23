-- O1-A ownership foundation — reusable contacts (Batch G2): a person or
-- organization reachable through one or more labeled phone/email methods,
-- explicitly attached to a property and/or entity with a role each time.
-- No existing table in this schema supports more than one phone/email per
-- record (vendors.contact_phone/contact_email and tenants.email/phone are
-- both single flat fields) — this is new infrastructure, not an extension
-- of an existing pattern.
create table contacts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  name text not null,
  notes text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table contacts enable row level security;
create policy "members can manage their contacts"
  on contacts for all using (is_account_member(account_id)) with check (is_account_member(account_id));

create table contact_methods (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  method_type text not null check (method_type in ('phone', 'email')),
  value text not null,
  -- pick_list_options, list_name = 'contact_method_label' (e.g. Mobile,
  -- Work, Home, Other) — no seeded values, per CLAUDE.md's data-integrity
  -- rule against inventing a taxonomy nobody asked for; the account owner
  -- adds their own via Manage Options, same precedent as subcategory/
  -- payment_method/task_type in 20260910220000_pick_list_options.sql.
  label text,
  is_preferred boolean not null default false,
  created_at timestamptz not null default now()
);

create index contact_methods_contact_idx on contact_methods (account_id, contact_id);
alter table contact_methods enable row level security;
create policy "members can manage their contact methods"
  on contact_methods for all using (is_account_member(account_id)) with check (is_account_member(account_id));

create table contact_links (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  property_id uuid references properties(id) on delete cascade,
  llc_id uuid references llcs(id) on delete cascade,
  -- pick_list_options, list_name = 'contact_role'.
  role text,
  -- Which of possibly several contacts linked to the SAME property/entity
  -- is the main one for that context — distinct from contact_methods.
  -- is_preferred, which is the contact's own preferred way to be reached.
  is_primary_contact boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  constraint contact_links_scope_check check (property_id is not null or llc_id is not null)
);

create index contact_links_property_idx on contact_links (account_id, property_id);
create index contact_links_llc_idx on contact_links (account_id, llc_id);
alter table contact_links enable row level security;
create policy "members can manage their contact links"
  on contact_links for all using (is_account_member(account_id)) with check (is_account_member(account_id));

-- Explicit and load-bearing, not incidental: creating a contact, method,
-- or link never creates a Supabase Auth user, an account_members row, or
-- any access grant. A contact is reachable information only. Verified
-- structurally, not just by convention: nothing in this migration
-- references auth.users for write purposes (only for created_by/
-- updated_by attribution, same as every other table in this schema), and
-- no function in this migration touches account_members.

-- Audit coverage (Batch I, I5: "audit new contacts, methods and links
-- with appropriate access controls") — extend the existing generic
-- trigger (log_audit_changes(), 20260910271200_audit_trail.sql /
-- 20260922080000_audit_log_actor_source.sql) to these three tables,
-- same mechanism already covering properties/llcs/mortgage_details, no
-- new trigger function needed.
alter table audit_log drop constraint audit_log_table_name_check;
alter table audit_log add constraint audit_log_table_name_check
  check (table_name in ('properties', 'llcs', 'mortgage_details', 'contacts', 'contact_methods', 'contact_links'));

create trigger contacts_audit_log
  after update on contacts
  for each row
  execute function log_audit_changes();

create trigger contact_methods_audit_log
  after update on contact_methods
  for each row
  execute function log_audit_changes();

create trigger contact_links_audit_log
  after update on contact_links
  for each row
  execute function log_audit_changes();

-- Known, pre-existing limitation carried into this extension rather than
-- silently worked around: log_audit_changes()'s skip_cols is
-- ['id','account_id','created_at','updated_at','property_id'] — a fixed
-- list shared across every table the trigger is attached to, not
-- per-table. contact_links has both property_id and llc_id columns;
-- property_id changes on it will therefore never appear in audit_log
-- (silently skipped, same as it would be on any other table), while
-- llc_id changes will. This is an existing quirk of the shared trigger's
-- design (already true wherever else a table might have a property_id
-- column), not something this migration changes or repairs — repairing
-- it would alter audit behavior on properties/llcs/mortgage_details too,
-- which is out of this batch's scope.

-- Same limitation as the base trigger everywhere else it's used: fires on
-- UPDATE only. Creating a new contact, method, or link is not itself
-- audit-logged — only subsequent edits to it are, exactly like every
-- other table this trigger covers.
