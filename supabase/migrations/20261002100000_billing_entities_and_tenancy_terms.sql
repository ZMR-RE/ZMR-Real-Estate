-- T4 Stage 1 — Rent & Payments Assistant: billing entity (RP2) and tenancy
-- billing terms (RP1). Additive only: no existing column changes meaning,
-- no existing row is rewritten, nothing is inferred from names or PDFs.
--
-- Reuses existing records:
--   * llcs (reusable entity profile) — legal name `name`, `display_name`,
--     `mailing_address/city/state/zip` already exist; this adds only the
--     invoicing-specific fields.
--   * leases — `rent_amount`, `start_date`, `end_date` stay the source of the
--     rent and the tenancy dates; `lease_tenants` stays the co-tenant list.
-- Error codes ZM300–ZM309.

-- RP2 — Billing entity (entity profile → Invoicing)
alter table llcs add column invoice_code text;
alter table llcs add constraint llcs_invoice_code_format
  check (invoice_code is null or invoice_code ~ '^[A-Z0-9]{1,8}$');
-- An account's codes must be distinct so document numbers can't collide
-- across its entities.
create unique index llcs_invoice_code_unique on llcs (account_id, invoice_code) where invoice_code is not null;
-- Reply-to email, contact details and the entity's DEFAULT payment
-- instructions live in entity_document_branding (20261001190000, the
-- independently releasable branding migration) — not duplicated here.

-- RP2 — Property → Billing settings: the EXPLICIT invoicing entity. Never
-- derived from ownership; null until the owner chooses.
alter table properties add column billing_entity_id uuid references llcs(id) on delete restrict;
-- Explicit per-property payment instructions. Null = inherit the invoicing
-- entity's default (entity_document_branding.payment_instructions).
alter table properties add column payment_instructions_override text;

create or replace function enforce_property_billing_entity_account()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.billing_entity_id is not null
     and not exists (select 1 from llcs where id = new.billing_entity_id and account_id = new.account_id) then
    raise exception 'The billing entity must belong to the same account as the property' using errcode = 'ZM300';
  end if;
  return new;
end $$;

create trigger properties_billing_entity_account
  before insert or update of billing_entity_id on properties
  for each row execute function enforce_property_billing_entity_account();

-- RP1 — billing recipients among the co-tenants. Explicit flag; a sole
-- tenant is not assumed to be the recipient.
alter table lease_tenants add column is_billing_recipient boolean not null default false;

-- RP1 — Tenancy & billing terms, one row per tenancy (lease). Rent comes
-- from leases.rent_amount; these are the billing-specific terms only.
create table lease_billing_terms (
  lease_id uuid primary key references leases(id) on delete cascade,
  account_id uuid not null references accounts(id) on delete cascade,
  frequency text not null default 'monthly' check (frequency in ('monthly')),
  -- 29–31 fall on the month's last day in shorter months.
  due_day smallint check (due_day between 1 and 31),
  -- Billing window; null falls back to the lease's own start/end dates.
  effective_from date,
  effective_to date,
  -- none   = full period charge even for a partial month
  -- daily  = rent × active days ÷ days in the month, to the cent
  -- manual = the owner enters the partial-month amount on the draft
  prorate_rule text not null default 'none' check (prorate_rule in ('none', 'daily', 'manual')),
  prorate_notes text,
  -- Billing continuity (owner-set, never inferred): this tenancy's billing
  -- continues from an earlier tenancy — e.g. a renewal written as a new
  -- lease. Only through this explicit link can an invoice show that earlier
  -- tenancy's unpaid balance (as a reference, never a new charge), and only
  -- for invoices issued by the same entity to a shared billed tenant.
  continues_lease_id uuid references leases(id) on delete restrict,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  constraint lease_billing_terms_dates check (effective_to is null or effective_from is null or effective_to >= effective_from),
  constraint lease_billing_terms_not_self check (continues_lease_id is distinct from lease_id)
);
-- A tenancy is continued by at most one later tenancy, so an earlier
-- balance can't appear in two billing relationships.
create unique index lease_billing_terms_one_successor on lease_billing_terms (continues_lease_id) where continues_lease_id is not null;

alter table lease_billing_terms enable row level security;

create policy "members can manage their lease billing terms"
  on lease_billing_terms for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

create or replace function lease_billing_terms_touch()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from leases where id = new.lease_id and account_id = new.account_id) then
    raise exception 'Billing terms must belong to the same account as the lease' using errcode = 'ZM301';
  end if;
  if new.continues_lease_id is not null then
    if not exists (select 1 from leases p join leases c on c.id = new.lease_id
                   where p.id = new.continues_lease_id and p.account_id = new.account_id and p.start_date < c.start_date) then
      raise exception 'Billing can only continue from an earlier tenancy in the same account' using errcode = 'ZM302';
    end if;
    -- No loops: walking back from the earlier tenancy must never reach this one.
    if exists (
      with recursive back(lease_id, depth) as (
        select new.continues_lease_id, 1
        union all
        select t.continues_lease_id, back.depth + 1 from back join lease_billing_terms t on t.lease_id = back.lease_id
        where t.continues_lease_id is not null and back.depth < 50)
      select 1 from back where lease_id = new.lease_id) then
      raise exception 'That link would make the tenancies continue from each other' using errcode = 'ZM303';
    end if;
  end if;
  if tg_op = 'UPDATE' then
    new.version = old.version + 1;
  end if;
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end $$;

create trigger lease_billing_terms_touch
  before insert or update on lease_billing_terms
  for each row execute function lease_billing_terms_touch();

-- No account-specific pick-list rows are seeded here. Issued invoice PDFs are
-- identified by documents.invoice_id and stored with the fixed system
-- category 'Invoices' (see attach_invoice_pdf); the account's editable
-- document-type pick list is left untouched.
