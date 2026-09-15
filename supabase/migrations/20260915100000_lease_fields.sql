-- Lease as a real linked-record entity (Roadmap item 8.5).
--
-- 8.4's own migration (20260911160000_tenants_entity.sql) already built
-- tenant_units specifically to become this: "This is intentionally
-- lightweight (no rent amount/term structure) — that's roadmap 8.5's
-- job... this table only establishes the linking history 8.4 itself
-- asks for." One row per tenancy period (start_date/end_date, end_date
-- null meaning current) already IS a lease period; extending it with
-- lease-specific fields is the correct move — a second, separate leases
-- table would just duplicate the tenant+unit+date-range linking 8.4
-- already built.
--
-- Both nullable: rent isn't required data until it's actually been
-- entered for a given tenancy, matching the same pattern already used
-- for holding companies / market value elsewhere in this schema.
alter table tenant_units add column rent_amount numeric(10, 2) check (rent_amount is null or rent_amount >= 0);
alter table tenant_units add column late_fee numeric(10, 2) check (late_fee is null or late_fee >= 0);
