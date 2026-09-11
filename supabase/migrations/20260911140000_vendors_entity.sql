-- Vendor as a real linked-record table (Roadmap item 8.3), same pattern
-- as 8.2's LLC entity migration (20260904193000_llcs_entity.sql): a
-- proper table instead of a free-text field, existing free-text values
-- migrated into real rows (one per distinct account_id + name) rather
-- than discarded, then the old text column dropped.
--
-- W9/insurance status are simple booleans for now, per the roadmap
-- item's own wording ("simple text/boolean fields are fine for now") —
-- not modeling document attachments or expiration dates yet.
create table vendors (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  name text not null,
  contact_email text,
  contact_phone text,
  has_w9 boolean not null default false,
  has_insurance boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, name)
);

alter table vendors enable row level security;

create policy "members can manage their vendors"
  on vendors for all
  using (is_account_member(account_id))
  with check (is_account_member(account_id));

-- Link to Transactions: financial_transactions.vendor_id replaces the
-- free-text vendor_source field.
alter table financial_transactions add column vendor_id uuid references vendors(id) on delete restrict;

do $$
declare
  r record;
  v_vendor_id uuid;
begin
  for r in
    select distinct account_id, vendor_source
    from financial_transactions
    where vendor_source is not null
  loop
    insert into vendors (account_id, name)
    values (r.account_id, r.vendor_source)
    on conflict (account_id, name) do nothing
    returning id into v_vendor_id;

    if v_vendor_id is null then
      select id into v_vendor_id from vendors where account_id = r.account_id and name = r.vendor_source;
    end if;

    update financial_transactions
    set vendor_id = v_vendor_id
    where account_id = r.account_id and vendor_source = r.vendor_source;
  end loop;
end $$;

alter table financial_transactions alter column vendor_id set not null;
alter table financial_transactions drop column vendor_source;

-- Link to Tasks — nullable, since not every task involves a vendor.
-- Schema-only for now (no Task Engine UI wired to it yet), same
-- ready-but-unused pattern already used for property_specs.unit_id ahead
-- of 7.2 — the roadmap item only requires the link to exist here.
alter table tasks add column vendor_id uuid references vendors(id) on delete set null;
