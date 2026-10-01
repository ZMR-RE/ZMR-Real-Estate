# Mortgage balance integrity: implementation record (T1, 2026-10-01)

**Approval:** the owner, relayed by planning: *"Yes, build the mortgage integrity fix with those choices."*
- **Built from:** the contract v2 (`bed4174`, copied here as `ZMR-mortgage-balance-integrity-contract.md`).
- **The owner's binding choices:**
  1. Inactive or replaced loans keep frozen balances, with no review task solely because the loan is inactive.
  2. **Balance edits from older browsers are refused** (reload required). This replaces the contract's "record and flag".
  3. Reversals above the original loan amount are refused, with a review cause.

**Status:** built and technically verified on a disposable local database. **Not** applied to Practice or production,
not visually reviewed, not released. **T3's contract review hasn't been received.** The mechanisms it would affect (§2)
are implemented as specified and are offered to T3 for review before this is finalized.

**Baseline:** verified live `origin/main` = `4f696c3f4f60cc5df6807d37f3790ec7c2f99ff8` (Agents, Netlify `6abeb18a…`, 110
migrations). The candidate branch `t1/mortgage-integrity` is built on it, so Agents is preserved. The main checkout (stale
at `c15733c`, with uncommitted `CLAUDE.md` edits) wasn't touched.

## 1. Scope
| Area | Files |
|---|---|
| Database (one forward migration) | `supabase/migrations/20261004100000_mortgage_balance_integrity.sql` |
| Recovery | `supabase/rollback/20261004100000_mortgage_balance_integrity_down.sql` |
| Mortgage module (T1) | `mortgagePayoffQueries.ts`, `useMortgageDetails.ts`, `useMortgagePayments.ts`, `useMortgageEscrow.ts`, `MortgagePaymentList.tsx`, `EscrowTransactionList.tsx`, new `mortgageBalanceIntegrity.ts` (+ test) |
| Action Queue review item (new T1 module) | `src/modules/mortgageBalanceReview/*` (queries, grouping + test, hook, item) |
| Shared Action Queue file | `src/modules/actionQueue/ActionQueueBoard.tsx`: **+3 lines** (import + `<MortgageBalanceReviewItem />` under "Needs entity"). Coordination note: `ZMR-T1-to-T2-T4-action-queue-mortgage-review.txt` |
| Tests | `supabase/tests/mortgage_integrity/run.sh` (49 cases + `--control`), `migration_preservation.sh` |

**Not in this batch** (as instructed): monthly scheduled review tasks, the full bank-debit split, any Financials file, and
any historical correction.

## 2. Behaviour
1. **Locking (D1):** each entry insert, void and reset locks the loan row first, then validates against the locked values.
   This fixes T3 C1–C4 and C6.
2. **Exact linkage (D3):** `mortgage_id` is set server-side on every new payment or escrow entry, whatever the client sends.
   A different client-supplied id is refused (`ZM5M1`). Pre-existing rows stay `NULL`, with no backfill.
3. **Immutable facts and a one-way void (D5):**
   - Changing dates, amounts, principal, interest, type, property or loan is refused (`ZM5M2`).
   - Un-void is refused, a repeat void is a no-op, and delete is refused.
   - Void details can only be set by voiding.
4. **Audit:** both activity tables are now in `audit_log`. The append-only `mortgage_balance_effects` table (no client
   writes) records each `applied` / `reversed` / `reversal_skipped` / `reset` / `void_refused` event. A unique key makes a
   reversal exactly-once.
5. **Conditional void (D2):** this is the same core whether the void comes from the current app
   (`void_mortgage_activity`) or an older browser (a plain `UPDATE voided = true`, via trigger).

   | Situation | Result | Review |
   |---|---|---|
   | Linked, active loan, no reset since | reversed exactly | none |
   | Reset of that balance after the entry (separate principal and escrow epochs) | voided, balance unchanged | yes |
   | Loan inactive or replaced | voided; that loan frozen; replacement untouched | **none** (choice 1) |
   | Unlinked legacy entry | voided, balance unchanged | yes, on the property's active loan |
   | Deposit reversal would make escrow negative | **not voided** | yes (current app); older browser: refusal message only |
   | Payment reversal above original amount | **not voided** | yes (current app); older browser: refusal message only |

6. **Resets (D4):** `reset_mortgage_balance(loan, expected_version, principal?, escrow?, statement_date?)`.
   - A changed value or a same-value confirmation bumps that balance's epoch and resolves only that balance's review causes.
   - A stale `expected_version` is refused (`ZM5M5`).
   - Inactive loans are refused (`ZM5M7`).
7. **Older browsers editing balances (choice 2):** a plain `UPDATE` that **changes** `current_balance` or `escrow_balance` is
   refused (`ZM5M6`): "This page is out of date and can't change the mortgage balance. Copy any unsaved changes, reload the
   page, then try again. Nothing was saved."
   - An unchanged resend plus other edits is allowed, and isn't a reset.
   - **Preserving unsaved input:**
     - **Older pages:** they keep the form open with the user's typed values after an error, so the user can copy them,
       reload, and re-enter.
     - **Current app:** a stale reset is refused while the form stays open with the user's input. The latest figures are
       loaded without closing the form, and the message states them. The user compares and saves again. Ordinary edits
       never send balances.
8. **Action Queue "Mortgage balance review":**
   - one item per loan, built from its open causes (not stored reminder rows);
   - principal and escrow are listed and confirmed separately ("… matches my latest statement" is a same-value reset of that
     balance only);
   - a different figure is entered from the Mortgage tab's Edit;
   - **confirming principal leaves escrow causes open** (test F14b).

## 3. Migration scope and data impact
- **One forward migration, `20261004100000`:**
  - it's dated after every applied migration (110), so it's a plain push;
  - T4's unreleased `20261002*` invoicing migrations sort before it. Whichever ships second needs the exact-set
    `--include-all` procedure.
- **No existing row, balance or loan changes.** Proven by `migration_preservation.sh` on fictional data shaped like the
  production 2169-Ash-St case:
  - earlier voided loan at 194,556.00 / 800.00;
  - a second voided loan;
  - current loan at 42,952.07 / 0.00.

  Results: md5 of all loans, entries and audit rows identical; balances identical; legacy rows `NULL`; zero effects or
  causes; counters at 0.

## 4. Tests and evidence (`docs/planning/mortgage/evidence/integrity-tests-2026-10-01/`)
| Run | Result |
|---|---|
| `run.sh` (candidate) | **49 passed, 0 failed**: concurrency R1–R11 (T3 method), linkage, immutability, one-way void, resets (separate epochs, same-value, stale, older browser), inactive loan, legacy, escrow refusal/order, over-original, per-balance resolution, permissions, audit |
| `run.sh --control` (rollback script applied) | **40 failed**: reproduces T3's C1 (950), C2 (120), C3/C4 (both rows), C6 (950), the missing reversals, and so on. Also proves the rollback script applies cleanly |
| `migration_preservation.sh` | 5/5 pass |
| T3's **original, unchanged** `run.sh` on live code | 5 cases wrong (C1–C4, C6), identical to T3's recorded result |
| Existing suites on the candidate | entity 43/43, branding 27/27, void-reconcile 36/36, closed-period 35/35 plus concurrency final state unchanged |
| App | `tsc -b` clean, build clean, vitest 208/208 (incl. new save-plan, void-outcome and review-grouping tests), oxlint 79 warnings = baseline 79 |

T3's retained reproduction is in `evidence/t3-mortgage-concurrency-2026-10-01/` (originals, SHA-256 in `PROVENANCE.txt`).

## 5. Compatibility limits
- **Older browsers** (bundle `4f696c3` and earlier) after the migration:
  - inserts work and are linked;
  - voids work with the same conditional rules;
  - a refused void shows a message but **creates no review item** (an aborted transaction can't keep one);
  - a changed balance is refused (reload).
- **Not verified on hosted Supabase:** the RPC calls, the PostgREST embed hint `mortgage_details!review_mortgage_id`, and the
  screens. Both need a coordinated Practice window with an approved Practice migration. Simulated or local checks aren't
  hosted proof.
- **The review item** shows the cause and the current balance. It doesn't show the voided entry's date or amount (the source
  link is polymorphic). That's a possible follow-up.

## 6. Recovery procedure (for a future approved release; nothing here is authorized)
1. **Before:**
   - get a verified backup;
   - prove the exact pending set (`20261004100000`, plus anything else pending, by name);
   - dry run.
2. **Database rollback:**
   - run `supabase/rollback/20261004100000_mortgage_balance_integrity_down.sql`, then
     `supabase migration repair --status reverted 20261004100000`;
   - this restores the old triggers. Columns, effects, causes and audit rows are kept, and reversals already applied stay.
   - It also restores the old defects for new activity.
3. **Frontend:**
   - the new frontend calls `void_mortgage_activity` / `reset_mortgage_balance`, so after a database rollback the frontend
     must also be rolled back to a pre-integrity build;
   - an older frontend works against both database states.
   - Order for a rollback: frontend first (to the immediately prior release), then the database.
4. **Release order:** database first, verified, then frontend. An older frontend is compatible with the new database (it gets
   refused balance edits, as chosen).

## 7. For T3 (evidence and review request)
- **Candidate:** `t1/mortgage-integrity` HEAD (exact hash in the report). Diff against `4f696c3`.
- **Please review:**
  - lock order, including the older-browser void path (activity row before loan, with a possible clean deadlock abort);
  - epoch and version semantics;
  - the security-definer functions' membership checks;
  - the `zmr.mortgage_internal` / `zmr.mortgage_void` transaction-local markers;
  - the refusal atomicity (current app: refusal plus cause committed together; older browser: raise, nothing kept);
  - the immutability coverage.
- **Re-run:**
  - `supabase/tests/mortgage_integrity/run.sh` and `run.sh --control`;
  - `migration_preservation.sh`;
  - your own `run.sh` against `4f696c3` as the live control.
