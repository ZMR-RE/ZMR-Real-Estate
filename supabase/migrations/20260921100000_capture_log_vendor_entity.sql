-- Roadmap 1.17 — Quick Capture's Vendor field must link to the real
-- Vendors entity (8.3), not remain free text, and Vendors need an
-- archive/restore path for their new Settings management view. Same
-- backfill-then-drop pattern as 20260911140000_vendors_entity.sql used
-- for financial_transactions.vendor_source, and the same archived-column
-- pattern as 20260918140000_llc_archived.sql used for llcs.

alter table vendors add column archived boolean not null default false;

alter table capture_log add column vendor_id uuid references vendors(id) on delete set null;

do $$
declare
  r record;
  v_vendor_id uuid;
begin
  for r in
    select distinct account_id, vendor
    from capture_log
    where vendor is not null
  loop
    insert into vendors (account_id, name)
    values (r.account_id, r.vendor)
    on conflict (account_id, name) do nothing
    returning id into v_vendor_id;

    if v_vendor_id is null then
      select id into v_vendor_id from vendors where account_id = r.account_id and name = r.vendor;
    end if;

    update capture_log
    set vendor_id = v_vendor_id
    where account_id = r.account_id and vendor = r.vendor;
  end loop;
end $$;

-- Unlike financial_transactions.vendor_id, this stays nullable — Vendor
-- is explicitly optional on a capture entry (1.7/1.16), not required.
alter table capture_log drop column vendor;
