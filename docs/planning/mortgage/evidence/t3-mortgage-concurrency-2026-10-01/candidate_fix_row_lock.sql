-- T3 TEST-ONLY ILLUSTRATION (2026-10-01). NOT a migration, NOT for any hosted database.
-- Used only by run.sh in "fixed" mode, as the control: the same two trigger functions as live
-- c15733c (20260915110000_mortgage_voided.sql), changed in exactly one way each — the mortgage
-- row is read with FOR UPDATE, so concurrent writers serialize on it and each sees the
-- previous writer's committed balance. Any real fix must go through T1/T2 review as a
-- proper migration with its own tests.

create or replace function apply_mortgage_payment_to_balance()
returns trigger
language plpgsql
as $$
declare
  balance_before numeric(12, 2);
begin
  select current_balance into balance_before
  from mortgage_details
  where property_id = new.property_id and not voided
  for update;

  if balance_before is null then
    raise exception 'No active mortgage_details found for property %; enter loan terms before logging payments.', new.property_id;
  end if;

  if new.principal_amount > balance_before then
    raise exception 'Principal amount (%) exceeds the current mortgage balance (%).', new.principal_amount, balance_before;
  end if;

  update mortgage_details
  set current_balance = balance_before - new.principal_amount,
      updated_at = now()
  where property_id = new.property_id and not voided;

  return new;
end;
$$;

create or replace function apply_mortgage_escrow_transaction_to_balance()
returns trigger
language plpgsql
as $$
declare
  balance_before numeric(12, 2);
begin
  select escrow_balance into balance_before
  from mortgage_details
  where property_id = new.property_id and not voided
  for update;

  if not found then
    raise exception 'No active mortgage_details found for property %; enter loan terms before logging escrow transactions.', new.property_id;
  end if;

  balance_before := coalesce(balance_before, 0);

  if new.transaction_type = 'disbursement' and new.amount > balance_before then
    raise exception 'Disbursement amount (%) exceeds the current escrow balance (%).', new.amount, balance_before;
  end if;

  update mortgage_details
  set escrow_balance = balance_before
    + case when new.transaction_type = 'deposit' then new.amount else -new.amount end,
      updated_at = now()
  where property_id = new.property_id and not voided;

  return new;
end;
$$;
