-- County and Township are different real-world values that were
-- incorrectly combined into one free-text field. Rename the existing
-- column to `county` (carrying every existing value forward as-is, no
-- guessing which of the two it represents) and add a new, separate
-- `township` column for the value that was never captured.
alter table properties rename column county_township to county;
alter table properties add column township text;
