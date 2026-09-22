-- Roadmap 9.9 (Quick Capture → Financials bridge) — Refund/Return
-- receipts must reduce the original expense category's total, not add
-- to Income. Per the confirmed design, this is implemented as a
-- negative-amount transaction in the same expense category, so it nets
-- out naturally in existing P&L sums with no special-case logic
-- anywhere reports are computed. That requires amount to allow negative
-- values; previously only strictly positive.
--
-- Scope is deliberately just "nonzero" (not "any positive or a specific
-- negative range") — a zero-amount transaction was never meaningful and
-- still isn't. TransactionForm's own input keeps min="0.01", so a human
-- still can't manually type a negative amount through the UI; only the
-- new auto-bridge (financialsQueries.createTransactionFromCapture) will
-- ever insert one, for Refund-Return specifically.
alter table financial_transactions drop constraint financial_transactions_amount_check;
alter table financial_transactions add constraint financial_transactions_amount_check
  check (amount <> 0);
