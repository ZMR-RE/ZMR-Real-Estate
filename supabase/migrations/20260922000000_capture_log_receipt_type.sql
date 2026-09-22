-- Roadmap 1.31 follow-up — "Entry direction" renamed to "Receipt type"
-- and widened from 2 values to 3: Expense / Income / Refund-Return.
-- Refund-Return computes as a REDUCTION to the original expense
-- category's total (not an addition to Income) — a Financials-side
-- concept (financial_transactions has its own separate entry_type);
-- this column has no live connection to Financials/P&L today (roadmap
-- 9.9, the capture-to-transaction bridge, is unbuilt), so this is
-- Quick-Capture-only scope, confirmed with the user rather than guessed
-- at. A plain rename (not add-new-column-keep-old), since this field
-- was only just built this session — no real user data exists under
-- the old name.
alter table capture_log rename column entry_direction to receipt_type;

alter table capture_log drop constraint capture_log_entry_direction_check;
alter table capture_log add constraint capture_log_receipt_type_check
  check (receipt_type is null or receipt_type in ('expense', 'income', 'refund_return'));
