-- Roadmap 7.32 — New Property Information fields.
--
-- Item 1: Lot size gets a real unit toggle (Acres / Sq ft). The
-- existing `lot_size` column is free text (e.g. "0.25 acres, 5,000
-- sqft") with no structured unit — 2169 Ash St already has a real
-- user-entered value ("2,864") in it with no way to tell which unit it
-- means, so per CLAUDE.md's data-integrity rule ("never seed, infer, or
-- guess a field's value") it is NOT carried forward into the new
-- structured columns below. It's kept, unused by the new toggle, same
-- no-drop precedent as municipal_zoning_code/garage_parking_spaces
-- (20260922100000) — the UI falls back to displaying this raw text
-- when the new lot_size_value is empty, so the real value stays visible
-- rather than disappearing, until the user re-enters it with a real
-- unit.
alter table properties add column lot_size_value numeric;
alter table properties add column lot_size_unit text check (lot_size_unit in ('acres', 'sqft'));

-- Item 3: Year built.
alter table properties add column year_built integer;

-- Items 4 & 5: Heating & Cooling, Exterior Information — plain text
-- columns constrained to pick lists at the UI layer, same pattern as
-- property_type/basement/street_parking.
alter table properties add column ac_type text;
alter table properties add column heating_type text;
alter table properties add column exterior_wall_material text;

-- Common values (no taxonomy given by the roadmap item beyond "common
-- values" — these are standard MLS-style categories, not a guess at any
-- specific property's own data).
insert into pick_list_options (account_id, list_name, value)
select a.id, 'ac_type', c.value
from accounts a
cross join (
  values ('Central air'), ('Window unit'), ('Ductless mini-split'), ('Evaporative cooler'), ('None')
) as c(value)
on conflict (account_id, list_name, value) do nothing;

insert into pick_list_options (account_id, list_name, value)
select a.id, 'heating_type', c.value
from accounts a
cross join (
  values ('Forced air (gas)'), ('Forced air (electric)'), ('Boiler/radiator'), ('Heat pump'), ('Baseboard electric'), ('None')
) as c(value)
on conflict (account_id, list_name, value) do nothing;

insert into pick_list_options (account_id, list_name, value)
select a.id, 'exterior_wall_material', c.value
from accounts a
cross join (
  values ('Brick'), ('Vinyl siding'), ('Wood siding'), ('Stucco'), ('Fiber cement'), ('Stone'), ('Aluminum siding'), ('Other')
) as c(value)
on conflict (account_id, list_name, value) do nothing;

-- Item 6: property photo reuses the existing documents architecture
-- (2.5) and its 'Photos' category (already seeded — the old fixed
-- documents.category check constraint included 'Photos', carried
-- forward into document_type's pick-list seed by 20260910220000). No
-- schema change needed: the property's photo is simply its most recent
-- documents row with category = 'Photos' and a storage_path set.
