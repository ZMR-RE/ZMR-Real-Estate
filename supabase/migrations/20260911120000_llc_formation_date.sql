-- ZMR Real Estate — LLC formation date (Roadmap item 8.2)
-- llcs (see 20260904193000_llcs_entity.sql) already covers name, EIN,
-- formation state, and registered agent, and properties.llc_id already
-- links Property to LLC. The one field 8.2 asks for that doesn't exist
-- yet is formation_date — distinct from the existing
-- annual_report_due_date (a recurring compliance deadline, not when the
-- LLC was formed). Nullable like every other optional LLC field: no
-- existing LLC has this on file, and per CLAUDE.md's Data integrity
-- rule nothing here may guess a value for it.
alter table llcs add column formation_date date;
