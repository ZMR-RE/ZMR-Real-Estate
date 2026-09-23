-- Units/Lease/Tenant rebuild, Stage 1 — a real Lease entity.
--
-- Roadmap 8.5 ("Lease as a real linked-record entity") was marked done
-- by extending tenant_units with rent_amount/late_fee columns rather
-- than building a second table — that migration's own comment argued a
-- separate leases table "would only have duplicated" tenant_units'
-- existing tenant+unit+date-range linking. That shortcut is exactly
-- what created the gap 7.52 later flagged: tenant_units is one row PER
-- TENANT, not per lease, so two co-tenants sharing one unit are
-- indistinguishable from two tenants each paying their own separate
-- rent — summing rent_amount across them can silently double-count,
-- which is why the Monthly rent stat card was deliberately held back.
--
-- This migration builds the real table 8.5 skipped. lease_tenants (the
-- many-to-many join) is the actual fix: a lease now has one rent
-- figure and N tenant rows pointing at it, not N independent rent
-- figures that happen to share a unit.
create table leases (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  -- Denormalized alongside unit_id (not derived via a join every time)
  -- — same precedent as utility_records (property_id not null, plus a
  -- separate unit_id), rather than forcing every caller to join through
  -- units!inner(property_id) the way tenant_units-based queries had to.
  property_id uuid not null references properties(id) on delete cascade,
  unit_id uuid not null references units(id) on delete cascade,
  -- Nullable, same shape tenant_units already used for rent_amount/
  -- late_fee (numeric(10,2), check >= 0 when present) — kept tolerant
  -- of incomplete historical data (the one live tenant_units row being
  -- backfilled in Stage 3 has rent_amount null) rather than forcing a
  -- NOT NULL that would require inventing a value, which the data
  -- integrity rule forbids. The Edit-mode LeaseForm enforces rent as
  -- required for new leases going forward at the UI layer.
  rent_amount numeric(10, 2) check (rent_amount is null or rent_amount >= 0),
  late_fee numeric(10, 2) check (late_fee is null or late_fee >= 0),
  move_in_fee numeric(10, 2) check (move_in_fee is null or move_in_fee >= 0),
  start_date date not null default current_date,
  end_date date,
  -- New field, not in tenant_units — "+ End lease" (Stage 5) captures
  -- why a lease ended (free text; no fixed taxonomy to pick-list here,
  -- unlike e.g. unit_status).
  end_reason text,
  -- Same soft-delete precedent as units/tenant_units (roadmap 8.12) —
  -- correcting a mistaken entry, never a hard delete.
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leases_end_after_start check (end_date is null or end_date >= start_date)
);

create index leases_account_property_idx on leases (account_id, property_id);
create index leases_unit_idx on leases (unit_id);

alter table leases enable row level security;

create policy "members can manage their leases"
  on leases for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

create or replace function set_leases_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger leases_set_updated_at
  before update on leases
  for each row
  execute function set_leases_updated_at();

-- The actual co-tenant fix: one lease, one-or-more tenants. Deliberately
-- NOT enforcing "one active lease per unit at a time" (no partial unique
-- index) — a brief overlap during a tenant transition (old tenant
-- moving out, new tenant moving in a few days early) is a legitimate
-- real-world case, not bad data; the UI just sums/lists whatever leases
-- are currently active on a unit.
create table lease_tenants (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  lease_id uuid not null references leases(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (lease_id, tenant_id)
);

create index lease_tenants_lease_idx on lease_tenants (lease_id);
create index lease_tenants_tenant_idx on lease_tenants (tenant_id);

alter table lease_tenants enable row level security;

create policy "members can manage their lease tenants"
  on lease_tenants for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

-- Note: lease status ("upcoming"/"active"/"ended") is deliberately NOT a
-- stored column here — computed at render/query time from start_date/
-- end_date, same "real-time check, not a snapshot" approach Insurance
-- already uses (getInsuranceStatus/insuranceExpirationUrgency,
-- insuranceQueries.ts). A stored status column would need something to
-- keep it in sync as calendar time passes with no write happening — and
-- this codebase has no cron/scheduled-function infrastructure anywhere
-- (confirmed before writing this migration) that could do that. See the
-- new leasesQueries.ts's getLeaseStatus().
