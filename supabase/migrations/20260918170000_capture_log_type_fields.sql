-- Roadmap 1.7 correction — 1.7 was checked off without ever building the
-- actual type-relevant fields for Receipt/Visit/Communication (Mileage
-- already got its extra field, miles_driven, in the 1.6/1.9 redesign).
-- All columns below are nullable: per 1.7, only entry_type/property_id/
-- entry_date gate the save; an incomplete entry just shows "Needs
-- details" (captureCalculations.ts), unchanged by this migration.
--
-- Receipt:
alter table capture_log add column vendor text;
alter table capture_log add column amount numeric(12, 2) check (amount > 0);
-- category reuses the existing 'subcategory' pick list (roadmap 8.1,
-- the same one Financials' transaction form uses) rather than a new
-- list — same taxonomy, one place to manage it (Settings > Pick lists).
-- Stored as plain text like every other pick-list-backed column in this
-- schema (financial_transactions.subcategory, .payment_method) — the
-- valid-value set is enforced at the application layer against active
-- pick_list_options rows, not a DB check constraint, so the account
-- owner can extend it without a migration.
alter table capture_log add column category text;

-- Visit:
alter table capture_log add column met_with text;

-- Communication:
alter table capture_log add column contact_name text;
alter table capture_log add column contact_method text;
alter table capture_log add column subject text;

-- Seed the 'contact_method' pick list with the 4 values specified for
-- this item (phone/email/text/in-person) — not a guess: this is an
-- explicitly given taxonomy, same as document_type's 7 categories were
-- carried forward in 20260910220000_pick_list_options.sql. Generic over
-- whatever accounts exist today, same as that seed.
insert into pick_list_options (account_id, list_name, value)
select a.id, 'contact_method', c.value
from accounts a
cross join (
  values ('Phone'), ('Email'), ('Text'), ('In-person')
) as c(value)
on conflict (account_id, list_name, value) do nothing;
