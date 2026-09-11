-- ZMR Real Estate — Security Deposit Tracking (Roadmap item 9.13)
--
-- Security deposits must post to the "Security Deposits Held" Liability
-- account (seeded in 9.1), never Income, and each transaction must clear
-- or partially clear that liability explicitly — no silent balance
-- adjustments, per the Bookkeeping rule in CLAUDE.md.
--
-- financial_transactions (2.3) is an income/expense ledger by design —
-- its entry_type check constraint only allows 'income'/'expense' and has
-- no liability leg — so deposits get their own ledger here rather than
-- being forced through it. This is also why this migration doesn't touch
-- financial_transactions or TransactionForm.tsx.
--
-- system_key on chart_of_accounts: the Chart of Accounts is user-editable
-- (name/description/type), so this feature can't rely on matching the
-- account by its display name. system_key is a stable, non-user-facing
-- handle set once at seed time that this feature (and future system
-- integrations) can look up by, independent of renames.

alter table chart_of_accounts add column system_key text;

create unique index chart_of_accounts_account_system_key_idx
  on chart_of_accounts (account_id, system_key)
  where system_key is not null;

update chart_of_accounts
  set system_key = 'security_deposits_held'
  where name = 'Security Deposits Held' and system_key is null;

-- Re-seed function: identical to 20260910210000's version except the
-- Security Deposits Held row now also sets system_key.
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
  insert into chart_of_accounts (account_id, type, name, description, system_key) values
    (target_account_id, 'liability', 'Security Deposits Held', 'Tenant security deposits held in trust — never posted to Income, per Bookkeeping rule', 'security_deposits_held');
  insert into chart_of_accounts (account_id, type, name, description) values
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

-- security_deposits — one row per deposit currently being tracked,
-- identified by property/unit/tenant. There is no Tenant entity yet
-- (roadmap 8.4), so tenant_name is free text, same convention as
-- invoices.billed_to in rentOps.
create table security_deposits (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  property_id uuid not null references properties(id) on delete restrict,
  unit text,
  tenant_name text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index security_deposits_account_property_idx on security_deposits (account_id, property_id);

alter table security_deposits enable row level security;

create policy "members can manage their security deposits"
  on security_deposits for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

-- security_deposit_transactions — the ledger. A deposit's balance is
-- always the sum of its non-voided transactions (received - returned -
-- applied_to_damages), computed on read, never a stored/edited field —
-- so there is no silent-balance-adjustment path. Correcting an entry
-- means voiding it (audit-visible, mirrors financial_transactions.voided),
-- never editing its amount.
create table security_deposit_transactions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  security_deposit_id uuid not null references security_deposits(id) on delete restrict,
  chart_account_id uuid not null references chart_of_accounts(id) on delete restrict,
  transaction_type text not null check (transaction_type in ('received', 'returned', 'applied_to_damages')),
  amount numeric(12, 2) not null check (amount > 0),
  transaction_date date not null,
  description text,
  recorded_by uuid references auth.users(id),
  voided boolean not null default false,
  voided_at timestamptz,
  created_at timestamptz not null default now()
);

create index security_deposit_transactions_deposit_idx
  on security_deposit_transactions (security_deposit_id, transaction_date);

alter table security_deposit_transactions enable row level security;

create policy "members can manage their security deposit transactions"
  on security_deposit_transactions for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));
