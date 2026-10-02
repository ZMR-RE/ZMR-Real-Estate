-- STAND-IN for T1's H2 migration (contract v5 §3), only what H1 reads plus the RLS/grants that
-- mirror mortgage_payments. Column names here are T2's proposed table contract (to be confirmed
-- by T1). The real proof repeats on T1's migration (contract v5 P2).
create table mortgage_history_payments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  mortgage_id uuid not null references mortgage_details(id),
  payment_date date not null,
  amount numeric(10, 2) not null check (amount > 0),
  principal_amount numeric(10, 2) not null check (principal_amount >= 0),
  interest_amount numeric(10, 2) not null check (interest_amount >= 0),
  declared_as_of date not null,
  duplicate_ack_matches integer check (duplicate_ack_matches > 0),
  voided boolean not null default false,
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz not null default now()
);
alter table mortgage_history_payments enable row level security;
create policy "members can manage their mortgage history payments" on mortgage_history_payments for all
  using (is_account_member(account_id)) with check (is_account_member(account_id));
revoke delete on mortgage_history_payments from authenticated;
