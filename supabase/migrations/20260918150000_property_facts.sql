-- Roadmap 7.20 — structured Property Facts fields. purchase_date already
-- exists (20260904192500_property_purchase_date.sql, added for roadmap
-- 2.4) but has never had a UI; this migration's Overview section wiring
-- finally gives it one, alongside these new columns.
alter table properties add column property_type text;
alter table properties add column purchase_method text;
alter table properties add column property_tax_id text;
alter table properties add column county_township text;
alter table properties add column square_footage numeric(10, 0);
alter table properties add column lot_size text;
alter table properties add column zoning_use_code text;

-- Roadmap 7.21 — whole-building totals (distinct from 7.11's per-unit
-- bed/bath, which lives on the units table). basement is free text
-- rather than a boolean since "yes/no or description" asks for more than
-- a flag (e.g. "Finished, walkout").
alter table properties add column bedroom_count integer;
alter table properties add column bathroom_count numeric(4, 1);
alter table properties add column basement text;
alter table properties add column garage_parking_spaces integer;
