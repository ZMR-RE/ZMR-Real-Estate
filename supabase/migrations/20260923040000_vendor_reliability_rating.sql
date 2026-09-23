-- Roadmap 8.11(a) — Contacts: a reliability score per vendor, alongside
-- the existing free-text `notes` column (already built, roadmap 1.28).
-- Fixed 1-5 scale rather than pick-list-backed: a reliability rating is
-- a small, consistent ordinal quality scale the product defines, not an
-- open vocabulary a user would want to extend with new values — same
-- class of exception as State (CLAUDE.md's Pick-list-first fields rule
-- already names that one; this is the same reasoning applied here).
alter table vendors add column reliability_rating integer
  check (reliability_rating is null or reliability_rating between 1 and 5);
