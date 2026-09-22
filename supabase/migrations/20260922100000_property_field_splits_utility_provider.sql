-- Roadmap 7.31 — Property Information Edit-mode overhaul.
--
-- Item 3: split zoning_use_code into two real fields. The old column is
-- kept, unused, never dropped, per CLAUDE.md's no-drop-without-approval
-- rule (matches the vendor_id / installment_N_document_id precedent) —
-- confirmed via a live query that no property currently has a
-- zoning_use_code value set, so there's nothing to carry forward.
alter table properties add column municipal_zoning_code text;
alter table properties add column county_assessor_use_code text;

-- Item 5: split garage_parking_spaces into three fields. Same
-- keep-the-old-column treatment; confirmed empty the same way.
alter table properties add column garage_spaces integer;
alter table properties add column street_parking text;
alter table properties add column parking_notes text;

-- Item 6: Utility records gets Provider name/contact, extending the
-- existing box (not a new table/section).
alter table utility_records add column provider_name text;
alter table utility_records add column provider_contact text;

-- Item 4: Basement becomes a pick list (basement column itself is
-- unchanged — already plain text — just now constrained to these
-- values at the UI layer, same as property_type/purchase_method).
-- Seeded with the exact 4 values the roadmap item specified —
-- explicitly given, not a guess, same precedent as contact_method/
-- visit_type's seeded lists.
insert into pick_list_options (account_id, list_name, value)
select a.id, 'basement_type', c.value
from accounts a
cross join (
  values ('Finished'), ('Unfinished'), ('Partially finished'), ('None')
) as c(value)
on conflict (account_id, list_name, value) do nothing;

-- Item 5's street_parking pick list, same reasoning — explicitly given
-- 4 values.
insert into pick_list_options (account_id, list_name, value)
select a.id, 'street_parking', c.value
from accounts a
cross join (
  values ('Unrestricted'), ('Permit required'), ('Time-restricted'), ('Not available')
) as c(value)
on conflict (account_id, list_name, value) do nothing;

-- Item 6's new utility_type option. utility_type (7.12) already exists
-- as a zero-seeded, fully account-editable pick list — this adds just
-- the one explicitly requested value, not a guessed taxonomy, same
-- seeding mechanism as every other pick list in this migration.
insert into pick_list_options (account_id, list_name, value)
select a.id, 'utility_type', 'Garbage/Trash'
from accounts a
on conflict (account_id, list_name, value) do nothing;
