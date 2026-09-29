# 2025 historical bookkeeping readiness — both properties

September 29, 2026. Scoped readiness assessment per the queued addendum
(`ZMR-next-handoff-learning-and-verification.txt`), executed as Part 2 of
`ZMR-package-1-release-readiness-corrections.txt`'s continuation. This is
an inspection of what already exists, not authorization to rebuild
accounting or execute the full approved backlog — see the report's own
"what to build next" section for the one recommended next slice.

**Verification tiers, stated per row, not assumed uniform:** "code-
reviewed" means read directly this pass; "live-tested (prior session)"
cites this project's own work log/contract evidence from earlier Package
1 sessions; "live-tested (this pass)" would mean the browser, but the
Chrome extension this session's tooling depends on was disconnected for
this entire pass (confirmed repeatedly) — **no new live-UI verification
was possible this pass**, which is why several rows below are marked
code-reviewed-only rather than re-confirmed live. Production frontend/
deploy status is a separate unknown from Practice/database status —
this document reports database-schema state (verified read-only against
production directly) and code state (verified by reading the actual
committed source), but cannot independently confirm which frontend
commit is currently serving production traffic; that would need to be
checked before treating any "already reachable" claim below as true for
the live production site specifically, as opposed to Practice.

## Readiness table

| Capability | Implemented? | In production? | Evidence | Gaps — historical entry | Gaps — reliable year-end reporting/export |
|---|---|---|---|---|---|
| Manual transaction entry, per property, with vendor/category/subcategory/payment-method | Yes (`Financials.tsx`/`TransactionForm.tsx`/`useFinancials.ts`) | DB objects it depends on (`financial_transactions`, chart-of-accounts tables) predate Package 1 and are already on production; frontend deploy status separately unverified | Live-tested, prior session (per contract §1): a real transaction edit + void produced exactly the expected 3 audit rows (`amount`, `voided`, `voided_at`) | None found | None found for entry itself |
| Per-transaction attached evidence (receipt/document upload) | Yes (`TransactionDocuments.tsx`, roadmap 9.6, reuses the existing document-storage architecture) | Same as above | Code-reviewed this pass; not re-tested live this pass | None found | None found |
| Financial-period lock/reopen | Yes (`FinancialPeriodLockControl`) | Same as above | Live-tested, prior session (per contract §1): a real lock + reopen produced exactly the expected 2 audit rows (`status` both ways) | — | Protects a closed year from silent edits once bookkeeping is finalized — a real safeguard for year-end, not just entry |
| CSV historical import (roadmap 2.4a) | Yes, and reachable — `/financials` route confirmed wired into `App.tsx` and `AppShell.tsx`'s nav (`Financials.tsx`'s own header comment claiming "not wired into App.tsx yet" is **stale**; contradicted by the routing file itself and by this session's own earlier direct navigation to `/financials` in Practice) | Same DB-schema caveat as above; frontend deploy status unverified | Code-reviewed this pass only — **no unit tests exist for `csvParsing.ts` or `useHistoricalImport.ts`, and no live run of the import wizard exists anywhere in this project's work log** | **No duplicate-detection of any kind.** `runImport` calls `bulkCreateTransactions` (a plain bulk insert) directly — re-uploading the same file, or two exports with overlapping date ranges, creates fully duplicated transactions with no warning, no dedup key (date+amount+vendor+property or otherwise), and no "already imported" marker. This is the single most important gap for safe historical entry. | Bank reconciliation (below) is a real but manual backstop, not a substitute for import-time dedup |
| Bank/statement reconciliation | Yes (`BankReconciliation.tsx`) — a manual "mark as reconciled" checklist against a real statement, not an automated feed matcher | Same as above | Code-reviewed this pass | A diligent user reconciling against a real statement would likely notice an extra unmatched duplicate line, but this depends entirely on the user doing that reconciliation — it is not an automatic safeguard | Same |
| Profit & Loss (Schedule E format) | Yes (`ProfitAndLossReport.tsx`/`computeProfitAndLoss`) | Same DB caveat | Code-reviewed this pass; computation is a straightforward per-period sum over whatever transactions are passed in — **not dependent on any opening balance**, so the missing-opening-balance gap below does not affect this report | None beyond correct entry | **No CSV/PDF export on the report screen itself** (only the raw transaction list and the separate tax-summary CSV have export buttons; the P&L/Balance Sheet/Cash Flow report screens do not) |
| Cash Flow report | Yes (`CashFlowReport.tsx`/`computeCashFlow`) | Same | Code-reviewed this pass; derives from the same period P&L plus a period principal-paid figure — **also not dependent on opening balances** | None beyond correct entry | Same missing-export gap as P&L |
| Balance Sheet report | Yes, but the "cash" figure is explicitly a simplification | Same | Code-reviewed this pass; the code's own comment states the assumption plainly, and the roadmap's own 9.2 checkbox already discloses it — this is not a hidden gap | **Depends on real opening balances, which do not exist (roadmap 9.18 explicitly unbuilt).** "Cash" is computed as all-time (income − expense) minus all-time mortgage principal paid, **assuming $0 cash at time zero** — the earliest transaction date recorded, not the property's actual acquisition-date cash position. For any property that had real cash/equity before its earliest entered transaction (true for both existing properties), the Balance Sheet's cash and therefore equity figures will be wrong until 9.18 is built and a real opening balance is entered. **Do not present this report as accurate for a period before all of a property's historical transactions are entered, and do not treat "cash" here as a real bank balance even after they are.** | Same missing-export gap, plus the opening-balance accuracy gap above |
| Tax-year CSV export (Schedule-E-style summary) | Yes (`exportTaxCsv`/`buildTaxExportCsv`) | Same | Code-reviewed this pass | — | Exists and is year/property-filterable; a real, usable accountant export for the summary shape |
| Raw transaction-list export (CSV + PDF) | Yes (`TransactionListExport.tsx`, shared `tableExport.ts`) | Same | Code-reviewed this pass | — | Exists, respects whatever year/property filter is active; property attribution included per row |
| Property/entity attribution | `financial_transactions.property_id` only (no direct per-transaction `llc_id`) | Same | Code-reviewed this pass | Correct by design, not a gap: ownership is per-property via the ownership-interests system (Package 1), not per-transaction; deriving the owning entity by following property → ownership avoids a second, redundant place for that fact to drift out of sync |
| Invoice / payment recording (Rent Ops foundation) | Yes (`RentOps.tsx`/`InvoiceForm.tsx`/`PaymentForm.tsx`) — fully manual: create an invoice, separately record a payment against it, no automation | Same | Code-reviewed this pass | Not in scope for historical *bookkeeping* directly, but is the existing foundation the addendum asked to assess for the invoice/receipt agent proposal below |

## What blocks historical data entry right now

**The import-duplication gap is the one real blocker.** Manual entry has
no blocking gaps at all — an owner can safely enter every 2025
transaction by hand today, with real audit trail, real period locking,
and real per-transaction evidence attachment, all already live-tested in
a prior session. The CSV import path *exists* and is *reachable*, but
has never been tested at all (no unit tests, no live run) and has a
specific, understood failure mode (silent duplication on any re-run or
overlapping upload) that manual entry does not share. This does not
block *starting* historical entry — it specifically blocks *safely using
the bulk CSV import path* for it without first either fixing the dedup
gap or manually verifying no overlap before every import run.

## What blocks trustworthy year-end reporting right now

**The Balance Sheet's cash/equity figures, and only those.** P&L and
Cash Flow are period-based calculations with no opening-balance
dependency — they are accurate today for whatever transactions are
correctly entered, regardless of 9.18's status. The Balance Sheet's
"cash" line specifically assumes $0 at time zero and will misstate real
equity for any property (both of the owner's properties, in practice)
that had cash or equity before its earliest entered transaction. Do not
call the Balance Sheet tax-ready or accurate until either a real opening
balance is entered (9.18) or its output is clearly caveated to the owner
as excluding pre-import cash. Exporting the reports themselves (P&L/
Balance Sheet/Cash Flow, not just the raw transaction list) does not
exist yet, which matters once the owner wants to hand something to an
accountant beyond a raw ledger.

## Opening balances — explicit, not invented

No opening balance exists anywhere in this system today. This report
does not propose one, guess one, or treat any current calculation as if
one existed. Roadmap 9.18 is the correct, already-identified place to
build real per-account opening balances "as of the backfill date" — it
remains unbuilt, and nothing here should be read as recommending a
workaround (e.g., a manually-entered "adjustment" transaction faking an
opening balance) without that being its own explicit, owner-approved,
clearly-labeled feature, not an ad hoc entry.

## Smallest connected build recommended next

A single, bounded slice: **duplicate detection on the CSV import path.**
Concretely: before `runImport` calls `bulkCreateTransactions`, check each
valid row against existing `financial_transactions` for the same
`account_id`/`property_id`/`transaction_date`/`amount`/`vendor_id`
(or `description` when no vendor), and surface any match to the user on
the existing preview step (already renders a per-row table) as "possible
duplicate — already on file" rather than silently importing it a second
time, with an explicit per-row override if the user confirms it's a
genuinely separate transaction that happens to match. This is scoped to
the one concrete blocker identified above, reuses the existing preview-
step UI rather than adding a new screen, and does not touch opening
balances, report exports, or anything else in this table — those remain
separate, larger, and not requested as part of this assessment.

## Spreadsheet information needed from the owner (not to be entered by the terminal)

To map the owner's actual 2025 records onto this system's fields, the
following would need to come from her own spreadsheets, for a terminal
to translate into column-mapping guidance (never to enter or import
himself):
- Which property each row belongs to, if her sheet mixes both.
- Column headers actually used for date, amount, income-vs-expense,
  category/subcategory, vendor/payee, payment method, and repair-vs-
  improvement (if tracked at all) — `csvParsing.ts`'s own guessing logic
  can only be verified against her real header names, not assumed.
- Whether she already distinguishes "repair" vs. "improvement" spending
  anywhere, since that flag changes depreciation treatment (see the
  existing double-count fix noted in `reportsCalculations.ts`).
- Any real cash/equity position she considers her properties' true
  starting point, for whenever 9.18 is actually built — not requested or
  entered now, just noted as the eventual input that feature will need.

## Invoice/receipt drafting agent — proposed scope only, not implemented

**Foundation already in place:** Rent Ops has real, manual invoice
creation and payment recording (`RentOps.tsx`) — an invoice's own status
is derived from whether a payment exists against it, not a separately-
settable "paid" flag a draft-writing agent could set on its own.

**Proposed initial scope**, two distinct agents, both draft-only:
1. **Payment-receipt drafting**: given an invoice already recorded in
   Rent Ops and a payment the owner describes or confirms, draft the
   receipt document (a formatted PDF/text summary) for the owner's own
   review before it's sent or saved anywhere — never auto-sent, never a
   ledger-posting action itself (the actual payment record is still
   entered through the existing `PaymentForm`).
2. **Expense-receipt extraction**: given an uploaded photo/PDF of an
   existing receipt, draft a pre-filled Quick Capture / Financials
   transaction entry (date, amount, vendor, likely category) for the
   owner to review and explicitly save — never auto-posts a transaction,
   never claims an invoice is paid on its own inference.

**Explicitly out of scope for this initial proposal:** autonomous
sending of anything to a tenant/vendor, any ledger-posting action taken
without an explicit owner save, and representing an unpaid invoice as
paid based on inferred/extracted evidence rather than a confirmed
payment record. **Dependencies**: none of Rent Ops' existing manual flow
needs to change for either agent — both sit on top of it as a drafting
layer. No implementation started; this is scope-and-dependencies only,
for owner review before any build begins.
