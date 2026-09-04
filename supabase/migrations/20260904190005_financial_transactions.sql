-- ZMR Real Estate — Financials & Tax Readiness (Roadmap item 2.3)
-- Income/expense ledger, scoped per account and property, categorized
-- against IRS Schedule E line items so the tax export lines up with
-- how a preparer will actually use it. entry_type/category are tied
-- together in the check constraint so an income row can never be
-- miscategorized under an expense line item or vice versa.
create table financial_transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  property_id uuid not null references properties(id) on delete restrict,
  entry_type text not null check (entry_type in ('income', 'expense')),
  category text not null,
  subcategory text,
  vendor_source text not null,
  unit text,                           -- which unit within the property, e.g. "Unit 1", "ALL"
  payment_method text not null,
  repair_or_improvement text check (repair_or_improvement in ('repair', 'improvement')),
  amount numeric(12, 2) not null check (amount > 0),
  transaction_date date not null,
  description text,
  recorded_by uuid references auth.users(id),
  voided boolean not null default false,
  voided_at timestamptz,
  -- distinct from capture_log.reconciled (which tracks Quick Capture
  -- triage) — this tracks matching against the bank/credit-card statement.
  statement_reconciled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_transactions_category_matches_type check (
    (entry_type = 'income' and category in ('rents_received', 'other_income'))
    or
    (entry_type = 'expense' and category in (
      'advertising',
      'auto_and_travel',
      'cleaning_and_maintenance',
      'commissions',
      'insurance',
      'legal_and_professional_fees',
      'management_fees',
      'mortgage_interest',
      'other_interest',
      'repairs',
      'supplies',
      'taxes',
      'utilities',
      'depreciation',
      'other_expense'
    ))
  ),
  -- repair_or_improvement only means anything on an expense row
  constraint financial_transactions_repair_or_improvement_expense_only check (
    entry_type = 'expense' or repair_or_improvement is null
  )
);

create index financial_transactions_account_property_date_idx
  on financial_transactions (account_id, property_id, transaction_date);

alter table financial_transactions enable row level security;

create policy "members can manage their financial transactions"
  on financial_transactions for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));
