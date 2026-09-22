-- Roadmap 10.5 — full Action Queue build (overhaul of 10.2's initial
-- cut). Two schema additions, both purely additive:
--
-- 1. Recurrence gains a 'custom' option alongside the existing weekly/
-- monthly/quarterly/yearly, backed by a new nullable custom_interval_days
-- (only meaningful when recurrence = 'custom'; "every N days" is the
-- simplest cadence that covers what a real-estate action item needs —
-- no separate value/unit pair, which would be unused complexity today).
alter table action_items drop constraint action_items_recurrence_check;
alter table action_items add constraint action_items_recurrence_check
  check (recurrence in ('none', 'weekly', 'monthly', 'quarterly', 'yearly', 'custom'));
alter table action_items add column custom_interval_days integer check (custom_interval_days is null or custom_interval_days > 0);

-- 2. source_label: a plain nullable free-text field for "linked source
-- (if any)" in the detail view. Nothing in the app creates an action
-- item from another record yet (10.5's own scope is explicitly
-- purely-user-defined creation, no auto-generation from other modules)
-- — this column exists so the detail view has somewhere to show that
-- link once a future bridge (e.g. a 9.9-style one) populates it. Left
-- null everywhere by this migration and by every creation path this
-- item builds, per CLAUDE.md's data-integrity rule against guessing a
-- field's value.
alter table action_items add column source_label text;

-- Roadmap 10.5 — action items get the same links + file-attachment
-- mechanism every other entity in this schema uses: one more nullable
-- FK on the existing documents table (same convention as
-- transaction_id/mortgage_id/property_tax_installment_id/
-- property_insurance_policy_id), not a parallel table.
alter table documents add column action_item_id uuid references action_items(id) on delete cascade;
