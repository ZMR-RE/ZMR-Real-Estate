-- ZMR Real Estate — Mortgage Payoff Scenario Calculator, real-data rebuild
-- (Roadmap item 6.2). The original version was a pure what-if tool with no
-- persistence; this backs it with actual per-property loan terms.
--
-- market_value is added to properties (optional — not every property will
-- have one entered right away) so equity/LTV can be shown alongside the
-- stored mortgage terms without guessing at a valuation source.
alter table properties add column market_value numeric(12, 2);

-- One row per property — mortgage terms are entered once and edited as
-- needed, not re-typed per scenario run. property_id is unique to enforce
-- that one-mortgage-per-property relationship.
create table mortgage_details (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  property_id uuid not null unique references properties(id) on delete cascade,
  lender_name text,
  original_loan_amount numeric(12, 2) not null check (original_loan_amount > 0),
  current_balance numeric(12, 2) not null check (current_balance >= 0),
  interest_rate numeric(6, 3) not null check (interest_rate >= 0), -- annual percent, e.g. 6.125
  monthly_payment numeric(10, 2) not null check (monthly_payment > 0), -- principal & interest
  loan_start_date date not null,
  term_years integer not null check (term_years > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table mortgage_details enable row level security;

create policy "members can manage their mortgage details"
  on mortgage_details for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));
