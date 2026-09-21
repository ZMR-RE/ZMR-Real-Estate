-- Roadmap 1.16 correction, made before this item was reviewed/shipped:
-- Payment method is reshaped from a flat pick-list value into a real
-- link to the property's own Financial accounts (7.18) plus a secondary
-- "how it was paid from that account" selector — one saved account,
-- multiple ways to pay from it (Debit card/Check/Zelle/ACH), rather
-- than a user needing a duplicate near-identical account per payment
-- method. capture_log.payment_method (added by
-- 20260921110000_capture_log_receipt_fields.sql) is kept as the column
-- that stores the "how" value — its meaning just narrows from "however
-- Financials' own payment_method pick list is populated" to specifically
-- "how this financial account was used" now that financial_account_id
-- exists alongside it; the column itself needed no schema change.
alter table capture_log
  add column financial_account_id uuid references property_financial_accounts(id) on delete set null;

-- 'payment_how' is a new, separate pick list from 'payment_method' —
-- Financials' own TransactionForm still uses 'payment_method' for its
-- own unrelated flat payment-method field, unaffected by this. Seeded
-- with the 4 values this correction specifies — an explicitly given
-- taxonomy, not a guess, same as contact_method/visit_type's seeds.
insert into pick_list_options (account_id, list_name, value)
select a.id, 'payment_how', c.value
from accounts a
cross join (
  values ('Debit card'), ('Check'), ('Zelle'), ('ACH')
) as c(value)
on conflict (account_id, list_name, value) do nothing;
