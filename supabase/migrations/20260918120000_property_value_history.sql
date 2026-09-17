-- Roadmap 7.19 — Property value & rent value history.
--
-- Replaces the single static properties.market_value field with a dated,
-- sourced log so a property's market value can be tracked over time
-- instead of overwritten in place. Adds the same pattern for a market
-- rent value — a distinct concept from tenant_units.rent_amount (8.5),
-- which is the actual contracted lease rent for a tenancy; this is a
-- manually-entered market/asking-rent estimate (e.g. a Zillow rent
-- estimate) tracked "even while occupied," independent of what a current
-- tenant actually pays. Manual entry only in this phase.
--
-- One table for both metrics rather than two near-identical tables,
-- since the shape (source, value, date) is identical and only the
-- `metric` column differs. Append-only + void (never edit/hard-delete),
-- matching mortgage_escrow_transactions/mortgage_payments — a wrong entry
-- gets voided and a corrected one added, not silently rewritten.
create table property_value_logs (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  metric text not null check (metric in ('market_value', 'rent_value')),
  value numeric(12, 2) not null check (value >= 0),
  source text not null,
  entry_date date not null,
  voided boolean not null default false,
  voided_at timestamptz,
  created_at timestamptz not null default now()
);

create index property_value_logs_account_property_idx on property_value_logs (account_id, property_id, metric);

alter table property_value_logs enable row level security;

create policy "members can manage their property value logs"
  on property_value_logs for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

-- The latest (most recent entry_date, ties broken by created_at) non-
-- voided value per property per metric — the one place every consumer
-- that used to read properties.market_value now reads from instead
-- (Mortgage tab equity/LTV, Portfolio KPI rollup, Balance Sheet report,
-- KPI tab snapshot). security_invoker so the underlying table's RLS
-- applies to the querying user, not the view owner.
create view property_latest_values
with (security_invoker = true) as
select distinct on (property_id, metric)
  account_id, property_id, metric, value, source, entry_date
from property_value_logs
where not voided
order by property_id, metric, entry_date desc, created_at desc;

-- Carry forward any real, user-entered market value already on file as
-- the first history entry, rather than silently losing it when the
-- column below is dropped. The original entry date was never tracked
-- (market_value had no date field), so this is honestly labeled as a
-- migrated entry rather than attributed to a source/date that was never
-- real.
insert into property_value_logs (account_id, property_id, metric, value, source, entry_date)
select account_id, id, 'market_value', market_value, 'Migrated from previous Market value field', current_date
from properties
where market_value is not null;

alter table properties drop column market_value;
