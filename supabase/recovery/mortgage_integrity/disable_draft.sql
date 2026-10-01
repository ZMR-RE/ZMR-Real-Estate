-- DRAFT forward migration, NOT APPROVED. Never apply from this folder. To use: review, approve, copy into
-- supabase/migrations/ with a new timestamp, apply with the exact-set procedure. Never "repair --status reverted".
-- Defined state after: 20261004100000 stays applied; every object and row it created is retained; the activity audit
-- triggers stay; balance writes return to the pre-integrity (unlocked, no-reversal) triggers. Frontend must be the
-- pre-integrity build.
drop trigger if exists mortgage_payments_apply_locked on mortgage_payments;
drop trigger if exists mortgage_escrow_transactions_apply_locked on mortgage_escrow_transactions;
drop trigger if exists mortgage_payments_activity_guard on mortgage_payments;
drop trigger if exists mortgage_escrow_transactions_activity_guard on mortgage_escrow_transactions;
drop trigger if exists mortgage_details_balance_guard on mortgage_details;
drop trigger if exists mortgage_details_record_opening on mortgage_details;
create trigger mortgage_payments_apply_to_balance
  after insert on mortgage_payments
  for each row execute function apply_mortgage_payment_to_balance();
create trigger mortgage_escrow_transactions_apply_to_balance
  after insert on mortgage_escrow_transactions
  for each row execute function apply_mortgage_escrow_transaction_to_balance();
-- functions, tables, columns, effects, causes, audit triggers, the audit check and the no-delete triggers (which protect
-- the effects record and cost nothing for the pre-integrity frontend) are intentionally retained
