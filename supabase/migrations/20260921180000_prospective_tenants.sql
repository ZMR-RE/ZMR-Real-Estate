-- Roadmap 1.28 revision — Visit's "who was met with" picker adds a
-- third category, "Potential tenants": prospective applicants/tour
-- visitors who aren't yet an existing Tenant (8.4) or Vendor (8.3).
-- Deliberately its own minimal table, not a repurposed `tenants` row —
-- a Tenant's whole identity in this schema is "someone with a lease
-- record" (tenant_units), and conflating an unleased prospect with that
-- would misrepresent 8.4/8.5's tenant history. property_id is required
-- (not account-wide like vendors/tenants): a prospect is inherently tied
-- to whichever property they toured, since they have no lease to anchor
-- them otherwise.
create table prospective_tenants (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index prospective_tenants_account_property_idx on prospective_tenants (account_id, property_id);

alter table prospective_tenants enable row level security;

create policy "members can manage their prospective tenants"
  on prospective_tenants for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

alter table capture_log add column met_with_prospective_tenant_id uuid references prospective_tenants(id) on delete set null;

-- Widen 20260921160000's 2-way mutual-exclusivity check to 3-way, now
-- that a visit's "who was met with" can also point at a prospective
-- tenant — still at most one of the three set at a time.
alter table capture_log drop constraint capture_log_met_with_vendor_or_tenant;
alter table capture_log add constraint capture_log_met_with_single_entity
  check (
    (met_with_vendor_id is not null)::int
    + (met_with_tenant_id is not null)::int
    + (met_with_prospective_tenant_id is not null)::int <= 1
  );
