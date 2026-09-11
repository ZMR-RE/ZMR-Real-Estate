-- Mileage log (Roadmap item 9.10) — quick-entry mileage tracking tied to
-- a property, logged from Quick Capture (1.3) and rolled up by property
-- in Financials (2.3) for tax purposes (mileage is its own IRS deduction
-- category, separate from financial_transactions income/expense rows).
create table mileage_log (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  logged_by uuid references auth.users(id),
  log_date date not null,
  miles numeric(8, 1) not null check (miles > 0),
  purpose text,
  created_at timestamptz not null default now()
);

create index mileage_log_account_property_idx on mileage_log (account_id, property_id);
create index mileage_log_account_date_idx on mileage_log (account_id, log_date);

alter table mileage_log enable row level security;

create policy "members can manage their mileage log"
  on mileage_log for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));
