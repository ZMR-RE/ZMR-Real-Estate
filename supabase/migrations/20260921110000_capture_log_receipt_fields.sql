-- Roadmap 1.16 — Receipt gets three more optional fields.
--
-- Unit: a real link to the units entity (7.2), not free text like
-- financial_transactions.unit — Quick Capture already links Property
-- for real (properties table), so Unit should be the same kind of real
-- reference, not a regression to free text. Nullable/on delete set null:
-- Unit is optional and a capture entry must survive a unit being
-- deleted.
alter table capture_log add column unit_id uuid references units(id) on delete set null;

-- Payment method: reuses the existing 'payment_method' pick list
-- (Financials' TransactionForm already uses it) — same taxonomy, one
-- place to manage it, same pattern as Receipt's Category field reusing
-- 'subcategory'. Nullable/optional, unlike
-- financial_transactions.payment_method which is required — this item's
-- own wording says "optional".
alter table capture_log add column payment_method text;

-- Repair vs. Improvement: NOT one of the generic pick lists (see
-- shared/pickLists/pickListsQueries.ts's PickListName comment) —
-- deliberately kept as the same fixed 2-value enum as
-- financial_transactions.repair_or_improvement so the two values stay
-- in lockstep with whatever a reconciled capture entry eventually
-- becomes.
alter table capture_log add column repair_or_improvement text
  check (repair_or_improvement in ('repair', 'improvement'));
