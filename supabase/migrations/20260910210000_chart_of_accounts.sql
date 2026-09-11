-- ZMR Real Estate — Chart of Accounts (Roadmap item 9.1)
-- Two tables:
--   chart_of_accounts        — the account list itself (Asset/Liability/
--                               Income/Expense), user-editable per the
--                               Bookkeeping rule in CLAUDE.md.
--   category_account_mappings — which Financials (2.3) transaction category
--                               posts to which chart-of-accounts row. Kept
--                               as its own table (not a column bolted onto
--                               financial_transactions) so the mapping is a
--                               visible, editable settings surface rather
--                               than hidden system logic.
--
-- Seeding is done via a function + an AFTER INSERT trigger on accounts,
-- not a one-off backfill, so every future account (Phase 5 signup, or a
-- manually created account before that) gets the same default chart of
-- accounts and full category mapping automatically — per the Multi-tenant
-- discipline rule, nothing here may assume ZMR's own data.

create table chart_of_accounts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  type text not null check (type in ('asset', 'liability', 'income', 'expense')),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, name)
);

create index chart_of_accounts_account_type_idx on chart_of_accounts (account_id, type);

alter table chart_of_accounts enable row level security;

create policy "members can manage their chart of accounts"
  on chart_of_accounts for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

-- One row per Financials transaction category (financial_transactions.category,
-- see 20260904190005_financial_transactions.sql), pointed at a chart-of-accounts
-- row. on delete restrict — a chart-of-accounts row that's currently mapped
-- can't be deleted out from under a category; it has to be remapped first.
create table category_account_mappings (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  category text not null check (category in (
    'rents_received',
    'other_income',
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
  )),
  chart_account_id uuid not null references chart_of_accounts(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, category)
);

alter table category_account_mappings enable row level security;

create policy "members can manage their category mappings"
  on category_account_mappings for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

-- Seeds the standard rental real-estate chart of accounts (reasonable
-- professional-judgment starting set, per roadmap 9.1 — the user is
-- expected to edit/extend it from here) and maps every existing
-- Financials category onto it. Idempotent on account_id so it's safe to
-- call again (e.g. re-running against an account that already has one).
create or replace function seed_default_chart_of_accounts(target_account_id uuid)
returns void
language plpgsql
as $$
declare
  v_rental_income uuid;
  v_other_income uuid;
  v_advertising uuid;
  v_auto_travel uuid;
  v_cleaning uuid;
  v_commissions uuid;
  v_insurance uuid;
  v_legal uuid;
  v_management uuid;
  v_mortgage_interest uuid;
  v_other_interest uuid;
  v_repairs uuid;
  v_supplies uuid;
  v_taxes uuid;
  v_utilities uuid;
  v_depreciation uuid;
  v_other_expense uuid;
begin
  if exists (select 1 from chart_of_accounts where account_id = target_account_id) then
    return;
  end if;

  -- Asset
  insert into chart_of_accounts (account_id, type, name, description) values
    (target_account_id, 'asset', 'Cash - Operating Account', 'Primary operating bank account for rental income and expenses'),
    (target_account_id, 'asset', 'Escrow Account', 'Mortgage-held escrow for property tax and insurance'),
    (target_account_id, 'asset', 'Accounts Receivable - Rent', 'Rent invoiced but not yet collected'),
    (target_account_id, 'asset', 'Property - Building & Improvements', 'Depreciable cost basis of buildings and capital improvements'),
    (target_account_id, 'asset', 'Property - Land', 'Non-depreciable cost basis of land'),
    (target_account_id, 'asset', 'Accumulated Depreciation', 'Cumulative depreciation taken against Building & Improvements (contra-asset)');

  -- Liability
  insert into chart_of_accounts (account_id, type, name, description) values
    (target_account_id, 'liability', 'Security Deposits Held', 'Tenant security deposits held in trust — never posted to Income, per Bookkeeping rule'),
    (target_account_id, 'liability', 'Mortgage Payable', 'Outstanding principal balance on property mortgages'),
    (target_account_id, 'liability', 'Accounts Payable', 'Vendor bills owed but not yet paid');

  -- Income
  insert into chart_of_accounts (account_id, type, name, description) values
    (target_account_id, 'income', 'Rental Income', 'Rent collected from tenants') returning id into v_rental_income;
  insert into chart_of_accounts (account_id, type, name, description) values
    (target_account_id, 'income', 'Other Income', 'Non-rent income (late fees, laundry, parking, etc.)') returning id into v_other_income;

  -- Expense (Schedule E line items)
  insert into chart_of_accounts (account_id, type, name, description) values
    (target_account_id, 'expense', 'Advertising', 'Marketing and listing costs') returning id into v_advertising;
  insert into chart_of_accounts (account_id, type, name, description) values
    (target_account_id, 'expense', 'Auto and Travel', 'Vehicle and travel expenses for property business') returning id into v_auto_travel;
  insert into chart_of_accounts (account_id, type, name, description) values
    (target_account_id, 'expense', 'Cleaning and Maintenance', 'Routine cleaning and upkeep') returning id into v_cleaning;
  insert into chart_of_accounts (account_id, type, name, description) values
    (target_account_id, 'expense', 'Commissions', 'Leasing and referral commissions') returning id into v_commissions;
  insert into chart_of_accounts (account_id, type, name, description) values
    (target_account_id, 'expense', 'Insurance', 'Property and liability insurance premiums') returning id into v_insurance;
  insert into chart_of_accounts (account_id, type, name, description) values
    (target_account_id, 'expense', 'Legal and Professional Fees', 'Attorney, accountant, and other professional fees') returning id into v_legal;
  insert into chart_of_accounts (account_id, type, name, description) values
    (target_account_id, 'expense', 'Management Fees', 'Property management fees') returning id into v_management;
  insert into chart_of_accounts (account_id, type, name, description) values
    (target_account_id, 'expense', 'Mortgage Interest', 'Interest paid to banks on property mortgages') returning id into v_mortgage_interest;
  insert into chart_of_accounts (account_id, type, name, description) values
    (target_account_id, 'expense', 'Other Interest', 'Interest paid other than mortgage interest') returning id into v_other_interest;
  insert into chart_of_accounts (account_id, type, name, description) values
    (target_account_id, 'expense', 'Repairs and Maintenance', 'Non-capitalized repairs (see repair-vs-improvement flag on transactions)') returning id into v_repairs;
  insert into chart_of_accounts (account_id, type, name, description) values
    (target_account_id, 'expense', 'Supplies', 'Supplies purchased for property upkeep') returning id into v_supplies;
  insert into chart_of_accounts (account_id, type, name, description) values
    (target_account_id, 'expense', 'Property Taxes', 'Real estate tax installments') returning id into v_taxes;
  insert into chart_of_accounts (account_id, type, name, description) values
    (target_account_id, 'expense', 'Utilities', 'Utilities paid by owner') returning id into v_utilities;
  insert into chart_of_accounts (account_id, type, name, description) values
    (target_account_id, 'expense', 'Depreciation', 'Annual depreciation expense') returning id into v_depreciation;
  insert into chart_of_accounts (account_id, type, name, description) values
    (target_account_id, 'expense', 'Other Expenses', 'Expenses not covered by another category') returning id into v_other_expense;

  insert into category_account_mappings (account_id, category, chart_account_id) values
    (target_account_id, 'rents_received', v_rental_income),
    (target_account_id, 'other_income', v_other_income),
    (target_account_id, 'advertising', v_advertising),
    (target_account_id, 'auto_and_travel', v_auto_travel),
    (target_account_id, 'cleaning_and_maintenance', v_cleaning),
    (target_account_id, 'commissions', v_commissions),
    (target_account_id, 'insurance', v_insurance),
    (target_account_id, 'legal_and_professional_fees', v_legal),
    (target_account_id, 'management_fees', v_management),
    (target_account_id, 'mortgage_interest', v_mortgage_interest),
    (target_account_id, 'other_interest', v_other_interest),
    (target_account_id, 'repairs', v_repairs),
    (target_account_id, 'supplies', v_supplies),
    (target_account_id, 'taxes', v_taxes),
    (target_account_id, 'utilities', v_utilities),
    (target_account_id, 'depreciation', v_depreciation),
    (target_account_id, 'other_expense', v_other_expense);
end;
$$;

create or replace function trigger_seed_default_chart_of_accounts()
returns trigger
language plpgsql
as $$
begin
  perform seed_default_chart_of_accounts(new.id);
  return new;
end;
$$;

create trigger accounts_seed_chart_of_accounts
  after insert on accounts
  for each row
  execute function trigger_seed_default_chart_of_accounts();

-- Backfill: seed the chart of accounts for every account that already
-- exists today (i.e. ZMR Real Estate), same function a brand-new account
-- gets via the trigger above.
do $$
declare
  r record;
begin
  for r in select id from accounts loop
    perform seed_default_chart_of_accounts(r.id);
  end loop;
end $$;
