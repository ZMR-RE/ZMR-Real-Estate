-- Rollback for 20261004100000_mortgage_balance_integrity.sql (T1). Run only as an explicit, approved recovery step,
-- followed by `supabase migration repair --status reverted 20261004100000`.
--
-- Restores the c15733c/4f696c3 database behaviour (unlocked AFTER INSERT triggers, no void reversal, direct balance
-- edits). That ALSO restores the defects for new activity (T3 C1–C6, D2–D4).
--
-- KEPT, deliberately: the new columns (mortgage_id, void_reason, void_outcome, balance_version, epochs), the
-- mortgage_balance_effects and mortgage_balance_review_causes tables and all their rows, the audit_log entries and
-- the widened audit_log table-name check. Reversals already applied stay applied (they were correct). Nothing is
-- deleted. A frontend rollback is not a database rollback, and this script is not a frontend rollback.

begin;

drop trigger if exists mortgage_payments_apply_locked on mortgage_payments;
drop trigger if exists mortgage_escrow_transactions_apply_locked on mortgage_escrow_transactions;
drop trigger if exists mortgage_payments_activity_guard on mortgage_payments;
drop trigger if exists mortgage_escrow_transactions_activity_guard on mortgage_escrow_transactions;
drop trigger if exists mortgage_payments_no_delete on mortgage_payments;
drop trigger if exists mortgage_escrow_transactions_no_delete on mortgage_escrow_transactions;
drop trigger if exists mortgage_details_balance_guard on mortgage_details;
drop trigger if exists mortgage_payments_audit_log on mortgage_payments;
drop trigger if exists mortgage_escrow_transactions_audit_log on mortgage_escrow_transactions;

drop function if exists void_mortgage_activity(text, uuid, text);
drop function if exists reset_mortgage_balance(uuid, bigint, numeric, numeric, date);
drop function if exists mortgage_void_core(text, uuid, uuid, uuid, uuid, numeric, numeric, text, boolean);
drop function if exists mortgage_activity_guard();
drop function if exists mortgage_activity_no_delete();
drop function if exists mortgage_details_balance_guard();
drop function if exists mortgage_payment_apply_locked();
drop function if exists mortgage_escrow_apply_locked();

-- The original trigger functions were never dropped by the forward migration; reattach them exactly as in
-- 20260904194000 / 20260910270000 (bodies as last defined in 20260915110000).
create trigger mortgage_payments_apply_to_balance
  after insert on mortgage_payments
  for each row execute function apply_mortgage_payment_to_balance();
create trigger mortgage_escrow_transactions_apply_to_balance
  after insert on mortgage_escrow_transactions
  for each row execute function apply_mortgage_escrow_transaction_to_balance();

commit;
