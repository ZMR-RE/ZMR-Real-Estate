-- Roadmap item 2.1 — Rent Ops: invoicing, receipts, on-time payment tracking.
-- No tenant/lease table exists yet (properties.lease_terms is still an
-- unstructured jsonb blob, per its own comment in the initial schema), so
-- invoices carry a free-text billed_to field rather than a tenant_id FK —
-- same "flexible for now" approach, not worth guessing tenant structure
-- here either. "On-time" is a derived status (paid_date vs due_date),
-- computed in the app rather than stored.

create table invoices (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  property_id uuid not null references properties(id) on delete restrict,
  billed_to text,
  period_start date not null,
  period_end date not null,
  amount_due numeric(10, 2) not null,
  due_date date not null,
  notes text,
  created_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  amount numeric(10, 2) not null,
  paid_date date not null,
  method text,
  notes text,
  created_at timestamptz not null default now()
);

alter table invoices enable row level security;
alter table payments enable row level security;

create policy "members can manage their invoices"
  on invoices for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

create policy "members can manage their payments"
  on payments for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));
