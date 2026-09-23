-- Units/Lease/Tenant rebuild, Stage 2 — cross-entity FK links.
--
-- documents.lease_id has existed as a bare, unconstrained uuid column
-- since the very first documents migration (20260910200000), which
-- explicitly left it (and unit_id) FK-less "waiting for Lease to become
-- a real linked-record table." That table now exists (Stage 1) — this
-- retrofits the FK onto the SAME column rather than adding a second
-- one. documents.category already includes 'Leases' in its check
-- constraint, so no category change is needed; a lease's documents are
-- just documents rows with lease_id set, same one-to-many-via-parent-FK
-- shape as transaction_id/mortgage_id on this same table.
alter table documents
  add constraint documents_lease_id_fkey
  foreign key (lease_id) references leases(id) on delete cascade;

-- documents.tenant_id — net new column, same per-parent-FK convention.
-- A tenant's own history can span multiple properties/leases, so a
-- document linked directly to a tenant (not via a specific lease) has
-- no single property_id to set — same "account-level, no property"
-- shape already used for action-item-linked documents with no property.
alter table documents add column tenant_id uuid references tenants(id) on delete cascade;

-- security_deposits.lease_id — nullable, on delete set null (not
-- cascade): a deposit's own received/returned/applied_to_damages ledger
-- is real financial history (CLAUDE.md's Bookkeeping rule), so it must
-- never be silently destroyed just because the lease it was tied to
-- gets deleted. security_deposits.unit/tenant_name stay exactly as they
-- are (free text) — this only adds a link, not a rearchitecture of that
-- module's own fields.
alter table security_deposits add column lease_id uuid references leases(id) on delete set null;
create index security_deposits_lease_idx on security_deposits (lease_id);

-- action_items.lease_id — nullable, on delete cascade: an action item
-- that only exists because of a specific lease's renewal window has no
-- reason to survive that lease being deleted. Backs the Stage 8
-- renewal-reminder feature; also gives the always-null source_label
-- column (added by the Action Queue full build, 20260922070000) its
-- first real consumer once Stage 8 lands.
alter table action_items add column lease_id uuid references leases(id) on delete cascade;
create index action_items_lease_idx on action_items (lease_id);
