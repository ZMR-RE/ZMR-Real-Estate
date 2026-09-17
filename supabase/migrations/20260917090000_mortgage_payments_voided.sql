-- Soft-delete/void support for mortgage_payments — closes the gap flagged
-- by the 2026-09-16 structural audit. mortgage_details and
-- mortgage_escrow_transactions already got this in 9.20
-- (20260915110000_mortgage_voided.sql); mortgage_payments was missed,
-- leaving no way to soft-delete a fabricated/erroneous payment row short
-- of a hard DELETE.

alter table mortgage_payments add column voided boolean not null default false;
alter table mortgage_payments add column voided_at timestamptz;

-- No trigger change needed here, unlike 9.20's migration: the only
-- balance-calculation trigger touching this table
-- (apply_mortgage_payment_to_balance, in 20260904194000_mortgage_payments.sql)
-- fires once on INSERT and reads mortgage_details.current_balance, not any
-- historical mortgage_payments rows — there's nothing for it to exclude.
-- Same precedent as escrow: voiding a payment here does not reverse its
-- earlier effect on mortgage_details.current_balance (that trigger only
-- ever runs on INSERT) — voiding corrects the record going forward, it
-- isn't a balance-adjustment tool. The actual gap this closes is at the
-- application layer: reportsQueries.ts's account-wide payment read for
-- Balance Sheet/Cash Flow now filters voided = false.
