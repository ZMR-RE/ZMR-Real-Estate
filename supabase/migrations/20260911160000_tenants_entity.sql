-- Tenant as a real linked-record table (Roadmap item 8.4), same pattern
-- as 8.2 (LLC) / 8.3 (Vendor): a real entity table, account-scoped, no
-- free-text field being replaced here since none existed for "tenant" as
-- a standalone concept (security_deposits.tenant_name and
-- leasing_listings' prospective-tenant notes stay free text — those are
-- about a deposit/listing record, not about managing tenants themselves).
--
-- A tenant is deliberately NOT a single foreign key on units — a tenant
-- can have a history across multiple units/leases over time, and a unit
-- can have a history of multiple tenants. tenant_units is the join/
-- history table: one row per tenancy period, end_date null meaning
-- "currently assigned." This is intentionally lightweight (no rent
-- amount/term structure) — that's roadmap 8.5's job (Lease as a real
-- linked-record entity, linked to Unit + Tenant); this table only
-- establishes the linking history 8.4 itself asks for.
create table tenants (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table tenants enable row level security;

create policy "members can manage their tenants"
  on tenants for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

create or replace function set_tenants_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tenants_set_updated_at
  before update on tenants
  for each row
  execute function set_tenants_updated_at();

create table tenant_units (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  unit_id uuid not null references units(id) on delete cascade,
  start_date date not null default current_date,
  end_date date,
  created_at timestamptz not null default now(),
  constraint tenant_units_end_after_start check (end_date is null or end_date >= start_date)
);

create index tenant_units_account_unit_idx on tenant_units (account_id, unit_id);
create index tenant_units_account_tenant_idx on tenant_units (account_id, tenant_id);

alter table tenant_units enable row level security;

create policy "members can manage their tenant unit assignments"
  on tenant_units for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));
