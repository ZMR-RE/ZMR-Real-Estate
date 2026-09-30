-- READ-ONLY DIAGNOSTIC — entries that are both voided and marked as matched
-- to a bank/credit-card statement. Changes nothing: runs inside a
-- read-only transaction that is rolled back. Works before or after
-- 20260929020000_void_reconcile_safeguard.sql is applied. Do NOT repair
-- the rows automatically: each needs an owner decision (was the void
-- right, or the match?), made through the app as separate recorded
-- changes.
--
-- Run only with explicit approval for the target database, e.g.
--   psql "$READ_ONLY_URL" -f supabase/diagnostics/void_reconcile_conflicts_readonly.sql
-- (credentials entered through masked terminal input, never pasted here).

begin transaction read only;

-- 1. How many, per account.
select account_id, count(*) as voided_and_matched
from financial_transactions
where voided and statement_reconciled
group by account_id
order by voided_and_matched desc;

-- 2. The rows themselves.
select id, account_id, property_id, transaction_date, amount, payment_method, voided_at, updated_at
from financial_transactions
where voided and statement_reconciled
order by account_id, transaction_date, id;

-- 3. When each flag last changed, where the audit trail recorded it.
select a.record_id, a.field_name, a.old_value, a.new_value, a.changed_at, a.source
from audit_log a
join financial_transactions ft on ft.id = a.record_id
where a.table_name = 'financial_transactions'
  and a.field_name in ('voided', 'statement_reconciled')
  and ft.voided and ft.statement_reconciled
order by a.record_id, a.changed_at;

rollback;
