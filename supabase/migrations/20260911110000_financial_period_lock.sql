-- Year-end closing/lock (Roadmap item 9.19) — locking a financial period
-- blocks edits to financial_transactions dated within it; reopening is an
-- explicit action. 9.17 (extending the 7.8 audit trail to financial
-- transactions) hasn't landed yet as of this migration, so the reopen
-- (and lock) action is logged the same way 7.8 already logs Property/
-- LLC/Mortgage field changes: by adding financial_periods to the same
-- generic log_audit_changes() trigger, rather than building bespoke
-- logging that 9.17 would likely duplicate or conflict with.
create table financial_periods (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  year integer not null check (year >= 1900),
  status text not null default 'open' check (status in ('open', 'locked')),
  created_at timestamptz not null default now(),
  unique (account_id, year)
);

create index financial_periods_account_idx on financial_periods (account_id);

alter table financial_periods enable row level security;

create policy "members can manage their financial periods"
  on financial_periods for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

-- Reuse 7.8's generic audit trigger (log_audit_changes(), defined in
-- 20260910271200_audit_trail.sql) so lock/reopen status changes land in
-- the same audit_log table members already know how to read. The
-- constraint already includes 'financial_transactions' as of 9.17's
-- (20260911100000) migration — extend that list, don't replace it.
alter table audit_log drop constraint audit_log_table_name_check;
alter table audit_log add constraint audit_log_table_name_check
  check (table_name in ('properties', 'llcs', 'mortgage_details', 'financial_transactions', 'financial_periods'));

create trigger financial_periods_audit_log
  after update on financial_periods
  for each row
  execute function log_audit_changes();

-- Enforcement lives at the database layer so no application code path —
-- present or future — can bypass a lock. Blocks UPDATEs (edits and voids
-- both go through UPDATE) on any financial_transactions row whose date
-- falls in a locked period; new transactions can still be entered for a
-- locked-elsewhere year, only edits to existing rows in the locked year
-- are blocked, matching the roadmap wording ("transactions within it
-- can't be edited").
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

create trigger financial_transactions_lock_guard
  before update on financial_transactions
  for each row
  execute function block_locked_period_transaction_edits();
