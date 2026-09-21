-- Roadmap 1.28 revision — Vendor gets a persistent "Relationship" tag
-- (account-scoped pick list, matching the pick-list-first convention
-- already used for contact_method/visit_type, not a fixed enum) and a
-- persistent Notes field on the vendor record itself — distinct from
-- any one Quick Capture Visit's own per-encounter notes.
alter table vendors add column relationship text;
alter table vendors add column notes text;

-- Seed with the exact 4 values the roadmap item specified — an
-- explicitly given taxonomy (not a guess), same precedent as
-- contact_method/visit_type's seeded lists in 20260910220000 and
-- 20260921090000.
insert into pick_list_options (account_id, list_name, value)
select a.id, 'vendor_relationship', c.value
from accounts a
cross join (
  values ('Used'), ('Estimate obtained'), ('Recommended'), ('Do not use')
) as c(value)
on conflict (account_id, list_name, value) do nothing;
