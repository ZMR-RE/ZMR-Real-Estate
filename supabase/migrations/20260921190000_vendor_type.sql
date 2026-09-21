-- Roadmap 1.31 — Vendor gets a "Vendor type" pick-list field (Store/
-- Contractor/Service provider/Other), same pick-list-first convention
-- already used for vendor_relationship (1.28 revision).
alter table vendors add column vendor_type text;

insert into pick_list_options (account_id, list_name, value)
select a.id, 'vendor_type', c.value
from accounts a
cross join (
  values ('Store'), ('Contractor'), ('Service provider'), ('Other')
) as c(value)
on conflict (account_id, list_name, value) do nothing;
