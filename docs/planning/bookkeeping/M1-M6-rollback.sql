-- M1–M6 emergency rollback — restores the database objects to exactly what
-- 20260911110000_financial_period_lock.sql + 20260922050000 left in place
-- before 20260930100000 / 20260930110000 were applied. Touches no data rows.
--
-- NOT a migration file on purpose (kept out of supabase/migrations so no
-- push can apply it by accident). If ever needed: run in one transaction,
-- then delete the two ledger rows noted at the end so the ledger matches.
-- Verified on a disposable local database (supabase/tests/closed_period_protection):
-- schema after rollback is identical to the pre-M6 schema.

begin;

-- 20260930110000 (same-account references)
drop trigger if exists financial_transactions_same_account on financial_transactions;
drop function if exists trg_financial_transactions_same_account();

-- 20260930100000 (closed-period protection)
drop trigger if exists financial_periods_change_guard on financial_periods;
drop function if exists guard_financial_period_changes();
drop trigger if exists financial_transactions_lock_guard on financial_transactions;

-- Original guard from 20260911110000_financial_period_lock.sql, verbatim.
create or replace function block_locked_period_transaction_edits()
returns trigger
language plpgsql
as $$
declare
  period_status text;
begin
  select status into period_status
  from financial_periods
  where account_id = old.account_id
    and year = extract(year from old.transaction_date)::integer;

  if period_status = 'locked' then
    raise exception 'This transaction is in a locked financial period (%) and cannot be edited until the period is reopened.',
      extract(year from old.transaction_date)::integer;
  end if;

  return new;
end;
$$;
-- 20260930100000 changed this function to SECURITY DEFINER with a fixed
-- search_path; CREATE OR REPLACE does not reset those attributes.
alter function block_locked_period_transaction_edits() security invoker;
alter function block_locked_period_transaction_edits() reset search_path;
-- Restores production's pre-M6 grants exactly (read-only check of production,
-- Sept 29, 2026: =X, postgres, anon, authenticated, service_role). The local
-- stand-in database has no Supabase default anon grant, so a local
-- before/after comparison differs only by that one entry.
grant execute on function block_locked_period_transaction_edits() to public, anon, authenticated;

create trigger financial_transactions_lock_guard
  before update on financial_transactions
  for each row
  execute function block_locked_period_transaction_edits();

drop function if exists financial_period_advisory_key(uuid, integer);

-- Ledger: remove the two versions so the history matches the schema.
delete from supabase_migrations.schema_migrations where version in ('20260930100000', '20260930110000');

commit;
