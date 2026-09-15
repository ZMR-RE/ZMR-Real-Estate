-- Soft-delete/void support for Mortgage records (Roadmap item 9.20)
--
-- mortgage_details and mortgage_escrow_transactions could previously only
-- be removed with a hard DELETE (there was no other path) — the same gap
-- financial_transactions and the rest of the app already closed with a
-- voided flag. This closes it here too, never a hard DELETE.

alter table mortgage_details add column voided boolean not null default false;
alter table mortgage_details add column voided_at timestamptz;

alter table mortgage_escrow_transactions add column voided boolean not null default false;
alter table mortgage_escrow_transactions add column voided_at timestamptz;

-- mortgage_details.property_id was UNIQUE, which is right for "one ACTIVE
-- mortgage per property" but would otherwise block ever entering a
-- replacement loan (e.g. after a refinance) once the old one is voided
-- instead of deleted. Swap the plain unique constraint for a partial
-- unique index that only applies to non-voided rows, so a property can
-- accumulate voided mortgage history without blocking new entries.
alter table mortgage_details drop constraint mortgage_details_property_id_key;
create unique index mortgage_details_property_id_active_idx
  on mortgage_details (property_id) where not voided;

-- Both balance-mutating triggers (mortgage_payments and
-- mortgage_escrow_transactions) look up "the" mortgage_details row for a
-- property by property_id alone. Now that more than one such row can
-- exist (voided history + the current one), that lookup has to exclude
-- voided rows explicitly — otherwise a payment or escrow transaction
-- could silently apply to a voided/superseded loan instead of the active
-- one. Re-created here with that one change; everything else matches the
-- originals in 20260904194000_mortgage_payments.sql and
-- 20260910270000_mortgage_escrow.sql.
create or replace function apply_mortgage_payment_to_balance()
returns trigger
language plpgsql
as $$
declare
  balance_before numeric(12, 2);
begin
  select current_balance into balance_before
  from mortgage_details
  where property_id = new.property_id and not voided;

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
  where property_id = new.property_id and not voided;

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
