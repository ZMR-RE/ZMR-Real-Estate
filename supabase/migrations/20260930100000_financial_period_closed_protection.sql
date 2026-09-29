-- M6 (owner-approved manual-bookkeeping package) — database-enforced
-- closed-period protection. Forward-only: replaces the guard function and
-- trigger from 20260911110000_financial_period_lock.sql without editing
-- that file or any existing row.
--
-- The original guard fired BEFORE UPDATE only and checked only OLD's
-- date, which left three ways to change a locked year's books:
--   1. INSERT a new transaction dated inside a locked year;
--   2. UPDATE an open-year transaction's date (or account) INTO a locked
--      year;
--   3. DELETE a locked-year transaction directly through the API (the app
--      itself only voids, but RLS permits delete for members).
-- The lock row itself could also be bypassed without the audited reopen:
-- deleting a locked financial_periods row, or changing its year/account,
-- silently unlocks a year and the audit trigger (AFTER UPDATE only) would
-- not show a reopen.
--
-- Semantics are unchanged otherwise: a lock is per account + calendar
-- year; members may still lock and reopen (reopen stays an audited
-- UPDATE of status); new periods may still be created open or locked.
--
-- Concurrency: a transaction write and a lock/reopen for the same
-- account + year serialize on a transaction-scoped advisory lock (shared
-- for transaction writes, exclusive for period changes). Without it, a
-- write that checked "open" could commit just after a concurrent lock
-- committed, leaving a new row inside a locked year. The guard's status
-- read happens after the advisory lock is granted, and plpgsql takes a
-- fresh snapshot per statement under READ COMMITTED, so it sees a lock
-- that committed while it waited.

create or replace function financial_period_advisory_key(p_account_id uuid, p_year integer)
returns bigint
language sql
immutable
as $$
  select hashtextextended('financial_period:' || p_account_id::text || ':' || p_year::text, 0)
$$;

create or replace function block_locked_period_transaction_edits()
returns trigger
language plpgsql
-- Definer so the lock lookup can't be narrowed by the caller's own RLS
-- view of financial_periods; the function only reads, and trigger
-- functions cannot be invoked directly as RPCs.
security definer
set search_path = public
as $$
declare
  v_old_year integer;
  v_new_year integer;
begin
  -- A signed-in caller who isn't a member of the row's account is left
  -- to RLS, which rejects the write; checking locks first would reveal
  -- another account's lock state in the error message. Callers without
  -- a user (service role, migrations) are always checked.
  if auth.uid() is not null and (
    (tg_op in ('UPDATE', 'DELETE') and not is_account_member(old.account_id))
    or (tg_op in ('INSERT', 'UPDATE') and not is_account_member(new.account_id))
  ) then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    v_old_year := extract(year from old.transaction_date)::integer;
    perform pg_advisory_xact_lock_shared(financial_period_advisory_key(old.account_id, v_old_year));
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    v_new_year := extract(year from new.transaction_date)::integer;
    if tg_op = 'INSERT' or new.account_id is distinct from old.account_id or v_new_year is distinct from v_old_year then
      perform pg_advisory_xact_lock_shared(financial_period_advisory_key(new.account_id, v_new_year));
    end if;
  end if;

  if tg_op in ('UPDATE', 'DELETE') and exists (
    select 1 from financial_periods
    where account_id = old.account_id and year = v_old_year and status = 'locked'
  ) then
    raise exception 'This transaction is in a locked financial period (%) and cannot be edited until the period is reopened.',
      v_old_year
      using errcode = 'ZM010';
  end if;

  if tg_op in ('INSERT', 'UPDATE') and exists (
    select 1 from financial_periods
    where account_id = new.account_id and year = v_new_year and status = 'locked'
  ) then
    raise exception 'The % financial period is locked. Reopen it before adding or moving transactions into it.',
      v_new_year
      using errcode = 'ZM010';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists financial_transactions_lock_guard on financial_transactions;
create trigger financial_transactions_lock_guard
  before insert or update or delete on financial_transactions
  for each row
  execute function block_locked_period_transaction_edits();

-- Period-row side: serialize with in-flight transaction writes, and close
-- the unaudited unlock paths. Reopening remains the one way to unlock.
create or replace function guard_financial_period_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform pg_advisory_xact_lock(financial_period_advisory_key(old.account_id, old.year));
  end if;
  if tg_op = 'INSERT' then
    perform pg_advisory_xact_lock(financial_period_advisory_key(new.account_id, new.year));
  end if;

  if tg_op = 'UPDATE' and (new.account_id is distinct from old.account_id or new.year is distinct from old.year) then
    raise exception 'A financial period''s account and year cannot be changed; reopen or lock the intended year instead.'
      using errcode = 'ZM011';
  end if;

  if tg_op = 'DELETE' and old.status = 'locked' then
    raise exception 'A locked financial period (%) cannot be deleted. Reopen it instead, which is recorded in the audit trail.',
      old.year
      using errcode = 'ZM011';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists financial_periods_change_guard on financial_periods;
create trigger financial_periods_change_guard
  before insert or update or delete on financial_periods
  for each row
  execute function guard_financial_period_changes();

-- Neither guard is meant to be callable as an RPC.
revoke execute on function block_locked_period_transaction_edits() from public, anon, authenticated;
revoke execute on function guard_financial_period_changes() from public, anon, authenticated;
revoke execute on function financial_period_advisory_key(uuid, integer) from public, anon, authenticated;
