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
drop trigger if exists mortgage_payments_no_delete on mortgage_payments;
drop trigger if exists mortgage_escrow_transactions_no_delete on mortgage_escrow_transactions;
create trigger mortgage_payments_no_delete before delete on mortgage_payments
  for each row execute function mortgage_activity_no_delete();
create trigger mortgage_escrow_transactions_no_delete before delete on mortgage_escrow_transactions
  for each row execute function mortgage_activity_no_delete();

-- R1: while disabled, balances could be edited directly without moving any counter. Treat the disabled period as an
-- UNKNOWN RESET of both balances on every active loan, so no pre-disable entry is ever reversed against a figure a person
-- may have replaced: both reset counters and both version counters move, statement dates become unknown, the
-- figure-entered times become now, and a reset effect records why. (Migrations run as a server-side role, so the
-- balance guard allows this.)
with bumped as (
  update mortgage_details
     set principal_epoch = principal_epoch + 1,
         escrow_epoch = escrow_epoch + 1,
         principal_version = principal_version + 1,
         escrow_version = escrow_version + 1,
         principal_as_of = null,
         escrow_as_of = null,
         principal_figure_at = now(),
         escrow_figure_at = now(),
         updated_at = now()
   where not voided
   returning id, account_id, property_id, principal_epoch, escrow_epoch
)
insert into mortgage_balance_effects
  (account_id, property_id, mortgage_id, source_kind, source_id, effect, principal_epoch, escrow_epoch, reason)
select account_id, property_id, id, 'reset', gen_random_uuid(), 'reset', principal_epoch, escrow_epoch, 're_enable'
  from bumped;
-- Entries recorded while disabled have no mortgage_id and no effect rows: they behave as unlinked legacy entries on void.
