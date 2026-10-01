-- T2: a voided transaction is never matched to a bank/credit-card statement
-- (T3 review of 40cf953). Standalone: depends only on
-- financial_transactions.voided / statement_reconciled, which production
-- already has. Timestamped to sort after production's latest migration
-- (20260929010000) and before every unreleased migration.
--
-- Defect it closes: the reconciliation save flips statement_reconciled
-- without excluding voided rows, and the ordinary Void does not check the
-- flag. So — sequentially as well as in races — an entry could end up both
-- voided and "matched to a statement", making that statement's
-- reconciliation wrong.
--
-- Rule, checked on every insert/update of either flag, against the row as
-- it stands when the write runs (a BEFORE trigger fires on the latest
-- committed row once the row lock is held, so both race orders are covered):
--   ZM093  voiding an entry and clearing its statement match in the same
--          write (un-matching must be its own, separately recorded write)
--   ZM092  any write that would leave an entry both voided and matched:
--          matching a voided entry, or inserting one that way
--   ZM091  voiding an entry that stays marked matched to a statement
-- Other simultaneous changes of both flags (restoring a voided entry while
-- matching or un-matching it) end in a consistent state and are allowed;
-- nothing in the app restores voided entries today. Removing a statement
-- match before a void is therefore always its own write. Today that
-- write is the "Matched to bank/credit-card statement" checkbox on the
-- transaction's edit form; the generic audit trail records the field
-- change. It is a per-transaction flag change, NOT a statement-level
-- reconciliation reversal — no statement-level reconciliation record
-- exists in this schema.
--
-- Existing rows that are already both voided and matched are NOT rewritten
-- or rejected: the rule fires only when a flag changes, and
-- financial_transactions_void_reconcile_conflicts lists them for review
-- (see also supabase/diagnostics/void_reconcile_conflicts_readonly.sql).

create or replace function trg_financial_transactions_void_reconcile()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.voided and new.statement_reconciled then
      raise exception 'A voided transaction cannot be marked as matched to a bank or credit-card statement.'
        using errcode = 'ZM092';
    end if;
    return new;
  end if;
  if new.voided and not old.voided and old.statement_reconciled and not new.statement_reconciled then
    raise exception 'Voiding and clearing the statement match cannot happen in the same save. Clear the statement match first, as its own change.'
      using errcode = 'ZM093';
  end if;
  if new.statement_reconciled and new.voided and not (old.statement_reconciled and old.voided) then
    if old.statement_reconciled and not old.voided then
      raise exception 'This transaction is marked as matched to a bank or credit-card statement. Clear that match first (a separate, recorded change), then void it.'
        using errcode = 'ZM091';
    end if;
    raise exception 'A voided transaction cannot be marked as matched to a bank or credit-card statement.'
      using errcode = 'ZM092';
  end if;
  return new;
end;
$$;

create trigger financial_transactions_void_reconcile
  before insert or update of voided, statement_reconciled on financial_transactions
  for each row execute function trg_financial_transactions_void_reconcile();

-- Entries already both voided and matched before this safeguard existed
-- (the caller's RLS applies). For review only; never corrected here.
create view financial_transactions_void_reconcile_conflicts with (security_invoker = true) as
select id, account_id, property_id, transaction_date, amount, payment_method, voided_at
from financial_transactions
where voided and statement_reconciled;

-- Signed-out callers never read it (RLS would already return nothing;
-- this makes the intent explicit on hosted Supabase, which grants anon by
-- default on new objects).
revoke all on financial_transactions_void_reconcile_conflicts from anon;
