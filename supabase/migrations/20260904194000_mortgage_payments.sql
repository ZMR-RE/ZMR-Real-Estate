-- ZMR Real Estate — Mortgage Payment Logging (roadmap 7.5 follow-up)
-- mortgage_details/mortgage_details.current_balance was, until now, only
-- ever hand-edited. This adds an actual payment ledger per property, and a
-- trigger keeps current_balance in sync automatically — at the database
-- level, so the balance stays correct no matter which client logs a
-- payment, not just the Property Profile UI.
create table mortgage_payments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  payment_date date not null,
  amount numeric(10, 2) not null check (amount > 0),
  principal_amount numeric(10, 2) not null check (principal_amount >= 0),
  interest_amount numeric(10, 2) not null check (interest_amount >= 0),
  created_at timestamptz not null default now(),
  constraint mortgage_payments_split_matches_amount check (
    abs(amount - (principal_amount + interest_amount)) < 0.01
  )
);

create index mortgage_payments_account_property_date_idx
  on mortgage_payments (account_id, property_id, payment_date);

alter table mortgage_payments enable row level security;

create policy "members can manage their mortgage payments"
  on mortgage_payments for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

-- Applies a logged payment's principal to the property's stored balance.
-- Rejects the payment outright if there's no mortgage_details row yet, or
-- if the principal portion is more than what's actually owed — both would
-- otherwise leave current_balance wrong or negative.
create or replace function apply_mortgage_payment_to_balance()
returns trigger
language plpgsql
as $$
declare
  balance_before numeric(12, 2);
begin
  select current_balance into balance_before
  from mortgage_details
  where property_id = new.property_id;

  if balance_before is null then
    raise exception 'No mortgage_details found for property %; enter loan terms before logging payments.', new.property_id;
  end if;

  if new.principal_amount > balance_before then
    raise exception 'Principal amount (%) exceeds the current mortgage balance (%).', new.principal_amount, balance_before;
  end if;

  update mortgage_details
  set current_balance = balance_before - new.principal_amount,
      updated_at = now()
  where property_id = new.property_id;

  return new;
end;
$$;

create trigger mortgage_payments_apply_to_balance
  after insert on mortgage_payments
  for each row
  execute function apply_mortgage_payment_to_balance();
