# T4 → T2: one rent payment, invoice allocations and Financials — dependency proposal

**From:** T4, the Agents / Rent & Payments Assistant track.
**To:** T2, the bookkeeping / Financials track.
**Relay:** through the planning conversation.
**Date:** September 30, 2026.
**Status:** proposal for T2 review. Not approved and not built.

**Nothing in T2's files was read-modified or changed to produce this.** T2 sources read (read-only, branch `t2/financials-workspace-preview` at `230699f`):

- `docs/planning/bookkeeping/ZMR-T2-accounting-implementation-proposal.md`
- `docs/planning/bookkeeping/ZMR-T2-accounting-v5-addendum.md`
- `src/modules/financials/transactionPayerQueries.ts`

## The problem

Today rent can be recorded twice, and nothing stops it:

- as a Rent ops `payments` row, against one invoice through `payments.invoice_id`;
- as a Financials `financial_transactions` income row, which since `20260922050000` can carry `tenant_id` as the payer.

These two rows are **not linked**. The same rent entered in both places counts as income twice.

The approved Agents requirements add three more needs:

1. One payment may pay several invoices, and partial payments are separate events.
2. Payment emails are evidence only.
3. There must be no duplicate financial entries.

## Proposal

The design keeps T2's existing model and reuses T2's own allocation pattern.

1. **One recorded rent payment = one T2 ledger row.**
   - The actual money received is recorded once, as T2's `income` row: rent into a bank account, cash method, "rent when received" (T2 proposal lines 127 and 265).
   - It uses T2's payer capability for the tenant (owner-approved `2982095`).
   - That row is the **only** income record for the payment. Invoices never post income.
2. **The Rent ops payment becomes a view of that row, not a second amount.** `payments` gains a required, unique link to the one `financial_transactions` row, a 1:1 relationship.
   - The amount, date and account are the ledger row's own values.
   - Rent ops shows it; it does not re-post it.
   - Existing unlinked `payments` rows stay as they are and are shown as "not linked to Financials". Nothing is guessed or auto-merged.
3. **Invoice allocations mirror `repayment_allocations`.** The new table is `rent_payment_allocations (payment_id, invoice_id, amount)`.
   - Rows total at most the payment amount.
   - Each row is at most that invoice's open balance.
   - The owner enters every split explicitly; no automatic order is applied (owner correction, Sep 30).
   - Any unallocated amount stays visible as unapplied on the payment.
   - This replaces the single `payments.invoice_id` for new records; old rows keep it.
4. **Payment notifications are evidence rows.** Recording one creates exactly the step-1 row (plus its link and allocations) after the owner confirms.
   - "Link as evidence" attaches the notice to an existing payment and creates nothing.
   - A notice never posts, settles or reconciles on its own.
5. **Entity consistency.** The deposit account's responsible entity must equal the issuing entity of every invoice the payment is allocated to.
   - This follows T2's approved rejection of cross-entity repayments and transfers, and of rent into personal accounts (T2 proposal lines 83, 209 and 222).
   - Mixed-entity splits are refused with an explanation.
6. **Duplicate guard.** Before a new payment is created, the tenant's existing ledger rows are checked. The comparison is direction + absolute amount + date window, T2's own duplicate rule (v5 addendum line 52).
   - A likely match offers "Link as evidence" first.
   - Recording anyway requires an explicit confirmation.

## Ownership boundary

| Owned by | Scope |
|---|---|
| **T2**, unchanged by T4 | `financial_transactions` posting, payer, reconciliation, reports, closed-period protection, the duplicate rule |
| **T4** | Rent ops invoice / receipt / payment-view and allocation records, assistant drafts, evidence notices, numbering |

**The interface between them:**

- one foreign key: `payments.financial_transaction_id`, unique, required for new payments;
- one allocation table;
- one shared validation: entity consistency and the duplicate check.

**Order of work:**

1. T2 confirms the contract and any naming.
2. T4 specifies the migration in isolation.
3. Both verify in Practice with the case "one $2,740 deposit → $1,020 + $1,720 allocations → one income row → P&L shows $2,740 once".
4. T3 reviews.

## Questions for T2

1. Is `income` with the tenant payer the right existing kind for rent receipts, or does T2 want a distinct `rent_income` kind or category mapping?
2. Should a payment be created **from the ledger side** (T2's transaction form or a statement match) and then allocated in Rent ops, from the Rent ops side, or both, through one shared function?
   - T4 recommends one shared database function used by both.
3. Closed periods: allocations change nothing in the ledger. Should re-allocating a payment in a closed period still be blocked for audit consistency?
4. Accounts Receivable – Rent exists in the Chart of Accounts but is unused.
   - T4 assumes the cash method: invoices never post.
   - Please confirm, or flag if accrual reporting is planned (an accountant decision).

## Explicitly not proposed

- No change to T2's M1–M6, the void/reconcile safeguards, or the reports.
- No migration or deployment.
- No backfill that links historical rows by guessing.
