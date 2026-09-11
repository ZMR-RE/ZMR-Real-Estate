-- Mortgage Escrow Tracking (Roadmap item 9.14)
--
-- escrow_balance lives on mortgage_details as its own column, deliberately
-- separate from current_balance (principal/interest). Nothing that reads
-- current_balance today — the loan-balance KPI (7.6's listPortfolioMortgages)
-- or the property tax ledger (9.5) — is touched by this migration, so
-- escrow can't get double-counted into or silently dropped from either.
-- Nullable, no default: per CLAUDE.md's data-integrity rule, a property
-- with no escrow account on file should show blank, not an invented 0.
alter table mortgage_details add column escrow_balance numeric(12, 2);

-- One row per escrow deposit or disbursement (e.g. the servicer pulling
-- from escrow to pay property tax or insurance) — mirrors the
-- mortgage_payments ledger-plus-trigger pattern from
-- 20260904194000_mortgage_payments.sql so escrow_balance stays correct no
-- matter which client logs the transaction.
create table mortgage_escrow_transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  transaction_date date not null,
  transaction_type text not null check (transaction_type in ('deposit', 'disbursement')),
  amount numeric(10, 2) not null check (amount > 0),
  description text,
  created_at timestamptz not null default now()
);

create index mortgage_escrow_transactions_account_property_date_idx
  on mortgage_escrow_transactions (account_id, property_id, transaction_date);

alter table mortgage_escrow_transactions enable row level security;

create policy "members can manage their mortgage escrow transactions"
  on mortgage_escrow_transactions for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

-- Applies a logged escrow transaction to the property's stored escrow
-- balance. Rejects it outright if there's no mortgage_details row yet
-- (same guard as mortgage payments), or if a disbursement would take the
-- balance negative — escrow holds real funds, it can't go below zero.
create or replace function apply_mortgage_escrow_transaction_to_balance()
returns trigger
language plpgsql
as $$
declare
  balance_before numeric(12, 2);
begin
  select escrow_balance into balance_before
  from mortgage_details
  where property_id = new.property_id;

  if not found then
    raise exception 'No mortgage_details found for property %; enter loan terms before logging escrow transactions.', new.property_id;
  end if;

  balance_before := coalesce(balance_before, 0);

  if new.transaction_type = 'disbursement' and new.amount > balance_before then
    raise exception 'Disbursement amount (%) exceeds the current escrow balance (%).', new.amount, balance_before;
  end if;

  update mortgage_details
  set escrow_balance = balance_before
    + case when new.transaction_type = 'deposit' then new.amount else -new.amount end,
      updated_at = now()
  where property_id = new.property_id;

  return new;
end;
$$;

create trigger mortgage_escrow_transactions_apply_to_balance
  after insert on mortgage_escrow_transactions
  for each row
  execute function apply_mortgage_escrow_transaction_to_balance();
