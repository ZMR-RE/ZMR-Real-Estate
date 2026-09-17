-- Roadmap 7.18 — Financial accounts reference: which bank account(s)/
-- credit card(s) are associated with a property. Hard rule, no
-- exceptions: this NEVER stores a full account/card number, only a
-- nickname + last 4 digits — enforced at the schema level, not just in
-- the form, so there is no column capable of holding more than that.
create table property_financial_accounts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  account_type text not null check (account_type in ('bank', 'credit_card')),
  nickname text not null,
  last_four text not null check (last_four ~ '^[0-9]{4}$'),
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create index property_financial_accounts_property_idx on property_financial_accounts (account_id, property_id);

alter table property_financial_accounts enable row level security;

create policy "members can manage their property financial accounts"
  on property_financial_accounts for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));
