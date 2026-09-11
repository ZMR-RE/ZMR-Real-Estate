-- Vendor-level Split Rule (Roadmap item 8.8)
--
-- A saved reimbursement percentage + description per vendor (e.g. pest
-- control, 50/50 with a tenant). Lives directly on vendors (8.3) since
-- it's a single rule per vendor, not a list of rules.
--
-- Per CLAUDE.md's Bookkeeping rule, a Split Rule is never auto-applied —
-- the UI only ever offers a one-click "Apply saved split" action on an
-- already-saved transaction, which inserts a separate reimbursement
-- transaction rather than editing the original. reimbursement_source_id
-- below is how that reimbursement row stays traceable back to the
-- original expense; it's only ever set by that explicit action, never by
-- the regular transaction form.
alter table vendors add column split_percentage numeric(5, 2) check (split_percentage > 0 and split_percentage <= 100);
alter table vendors add column split_description text;

alter table financial_transactions
  add column reimbursement_source_id uuid references financial_transactions(id) on delete set null;
