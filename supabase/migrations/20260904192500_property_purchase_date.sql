-- Roadmap item 2.4 (Historical Data Backfill, purchase-date portion only —
-- bookkeeping backfill is deferred until 2.3's financial_transactions table
-- exists; the owner will enter historical transactions manually there).
--
-- Adds purchase_date to properties and backfills the two known dates.
-- RLS already covers this column since it's on the existing properties
-- table (scoped by account_id, per CLAUDE.md data safety rule) — no new
-- policy needed.

alter table properties add column purchase_date date;

update properties
set purchase_date = '2025-07-08'
where name = '5336 W Foster Ave';

update properties
set purchase_date = '2018-01-11'
where name = '2169 Ash St';
