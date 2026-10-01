-- DRAFT forward migration, NOT APPROVED. Re-enables the integrity rules after disable_draft.sql. Same handling: review,
-- approve, copy into supabase/migrations/ with a new timestamp, exact-set apply. Functions are the ones from
-- 20261004100000 (retained by the disable).
drop trigger if exists mortgage_payments_apply_to_balance on mortgage_payments;
drop trigger if exists mortgage_escrow_transactions_apply_to_balance on mortgage_escrow_transactions;
create trigger mortgage_details_balance_guard before insert or update on mortgage_details
  for each row execute function mortgage_details_balance_guard();
create trigger mortgage_details_record_opening after insert on mortgage_details
  for each row execute function mortgage_record_opening();
create trigger mortgage_payments_apply_locked before insert on mortgage_payments
  for each row execute function mortgage_payment_apply_locked();
create trigger mortgage_escrow_transactions_apply_locked before insert on mortgage_escrow_transactions
  for each row execute function mortgage_escrow_apply_locked();
create trigger mortgage_payments_activity_guard before update on mortgage_payments
  for each row execute function mortgage_activity_guard();
create trigger mortgage_escrow_transactions_activity_guard before update on mortgage_escrow_transactions
  for each row execute function mortgage_activity_guard();
create trigger mortgage_payments_no_delete before delete on mortgage_payments
  for each row execute function mortgage_activity_no_delete();
create trigger mortgage_escrow_transactions_no_delete before delete on mortgage_escrow_transactions
  for each row execute function mortgage_activity_no_delete();
-- Entries recorded while disabled have no mortgage_id and no effect rows: they behave as unlinked legacy entries on void.
