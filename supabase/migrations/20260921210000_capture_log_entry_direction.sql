-- Roadmap 1.33 groundwork — scoped narrowly, per explicit instruction,
-- to just enough to drive Receipt's "Paid to"/"Received from" label
-- switch (1.31's refinement). Full 1.33 (Category dropdown filtering to
-- Income vs. Expense categories) is NOT built here and stays open on
-- the roadmap.
--
-- Fixed 2-value field, not an account-editable pick list — same
-- reasoning as repair_or_improvement (a deliberate Pick-list-first
-- exception, flagged in pickListsQueries.ts): this is a structural
-- accounting concept a future filtering feature depends on, not a
-- business-specific taxonomy an owner would want to add to.
alter table capture_log add column entry_direction text
  check (entry_direction is null or entry_direction in ('income', 'expense'));
