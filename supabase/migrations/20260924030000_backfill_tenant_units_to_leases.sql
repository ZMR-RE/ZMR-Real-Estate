-- Units/Lease/Tenant rebuild, Stage 3 — backfill tenant_units into
-- leases/lease_tenants.
--
-- Grouping key: tenant_units rows sharing the same
-- (unit_id, start_date, end_date, rent_amount, late_fee, archived,
-- account_id) represent co-tenants on ONE real lease, not N separate
-- leases — collapsing them is the actual point of this migration
-- (a naive 1:1 row copy would just recreate today's double-counting
-- bug under a new table name). Written generically, not hardcoded to
-- today's data, though live data checked immediately before writing
-- this is trivial: exactly one tenant_units row total in the account
-- (archived, rent_amount null, no co-tenants to collapse).
with grouped as (
  select
    unit_id,
    start_date,
    end_date,
    rent_amount,
    late_fee,
    archived,
    account_id,
    min(created_at) as created_at,
    gen_random_uuid() as new_lease_id
  from tenant_units
  group by unit_id, start_date, end_date, rent_amount, late_fee, archived, account_id
),
inserted_leases as (
  insert into leases (id, account_id, property_id, unit_id, rent_amount, late_fee, start_date, end_date, archived, created_at)
  select
    g.new_lease_id, g.account_id, u.property_id, g.unit_id,
    g.rent_amount, g.late_fee, g.start_date, g.end_date, g.archived, g.created_at
  from grouped g
  join units u on u.id = g.unit_id
  returning id, unit_id, account_id
)
insert into lease_tenants (account_id, lease_id, tenant_id)
select tu.account_id, il.id, tu.tenant_id
from tenant_units tu
join grouped g on g.unit_id = tu.unit_id
  and g.start_date = tu.start_date
  and g.end_date is not distinct from tu.end_date
  and g.rent_amount is not distinct from tu.rent_amount
  and g.late_fee is not distinct from tu.late_fee
  and g.archived = tu.archived
join inserted_leases il on il.unit_id = g.unit_id and il.account_id = g.account_id;

-- tenant_units is kept, NOT dropped or truncated. This repo's own bar
-- for dropping a column/table is "confirmed zero data" — the only two
-- precedents (properties.unit_config, properties.zoning_use_code) both
-- had genuinely zero rows before being dropped. tenant_units has real
-- (if minimal) historical data, so it doesn't qualify. The app stops
-- reading/writing it once Stages 5-6 land (UnitsSection.tsx's rent
-- summing and propertyTenantsQueries.ts both move to leases/
-- lease_tenants); this comment documents the deprecation for anyone
-- who queries it directly afterward.
comment on table tenant_units is
  'Deprecated as of the Units/Lease/Tenant rebuild (leases/lease_tenants tables, migrated 20260924030000). No longer written to by the app — kept read-only per this repo''s never-drop-without-confirmed-zero-data convention (unit_config/zoning_use_code precedent), since this table has real historical rows.';
