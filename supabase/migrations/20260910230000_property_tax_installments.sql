-- Property Tax Installment ledger (Roadmap item 9.5) — one row per
-- property per tax year, with two installments (most jurisdictions bill
-- property tax in two halves). Each installment can carry its own attached
-- bill/receipt document, stored via the existing 2.5 document architecture
-- (documents table + private "documents" storage bucket) rather than a
-- free-text link field.
--
-- installment_N_document_id points at a row in documents (not the other
-- way around) so this table only adds new columns/rows of its own and
-- never touches the documents table itself.
create table property_tax_installments (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  property_id uuid not null references properties(id) on delete cascade,
  tax_year integer not null check (tax_year >= 1900),
  installment_1_amount numeric(12, 2) check (installment_1_amount >= 0),
  installment_1_paid_date date,
  installment_1_document_id uuid references documents(id) on delete set null,
  installment_2_amount numeric(12, 2) check (installment_2_amount >= 0),
  installment_2_paid_date date,
  installment_2_document_id uuid references documents(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, tax_year)
);

create index property_tax_installments_account_property_idx
  on property_tax_installments (account_id, property_id);

alter table property_tax_installments enable row level security;

create policy "members can manage their property tax installments"
  on property_tax_installments for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));
