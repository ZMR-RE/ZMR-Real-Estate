# Mortgage balance integrity: consolidated correction contract (T1, 2026-10-01, v2). Design only

**Supersedes v1 (`220e3f4`).** It's reconciled with T3's reproduction and the owner's corrections.
**Priority:** before any cosmetic mortgage release. The visual proposal and the approved requirements are preserved.
**Not authorized:** implementation, migration application, historical correction, production change. That includes under the
Agents approval.

**Inputs:**
- **T3's reproduction**, kept durably at `docs/planning/mortgage/evidence/t3-mortgage-concurrency-2026-10-01/` (originals,
  SHA-256 in `PROVENANCE.txt`): seven concurrency cases C1–C7 on live `c15733c`, 5 wrong; a row-lock control, 0 wrong.
- **The production read-only lookup** `~/ZMR-Backups-Private/mortgage-sep15-readonly-20261001-134831.log`.
- **Live code `c15733c`.**

**Fixed constraint:** no correction of the current Fifth Third balance (`d6e8ba82-5e6f-40ba-bb10-f1b1a82100be`). No backfill.

## 1. Defects being corrected
| # | Defect | Evidence |
|---|---|---|
| D1 | The insert triggers read the balance without a lock and write `stale ± amount`, so concurrent entries lose updates, and the overdraw and exceeds-balance guards check a stale value | T3 C1–C4, C6 (live wrong; control right) |
| D2 | A void never reverses the entry's balance effect | code; T3 (confirmed); Sep 15 Test Bank record |
| D3 | Entries carry no loan reference, so their effect lands on "the property's active loan" with no record of which | code; Sep 15 lookup |
| D4 | The edit form writes balances as absolute values with no stale check and no record that a reset happened; an absolute edit can absorb a concurrent entry | T3 C7; code |
| D5 | Activity tables aren't audited; financial facts are editable by any member through the API | code |

## 2. Contract
### 2.1 Locking (fixes D1; T3 C1–C6 become the regression suite)
- **Every balance-changing operation** (entry insert, void reversal, balance reset) first takes the loan row with
  `SELECT … FOR UPDATE`, then validates against the locked value, then writes.
- Lock order is always **loan row first**. A void additionally locks its activity row *after* the loan (it reads the
  activity's `mortgage_id` without a lock, then locks the loan, then re-reads the activity `FOR UPDATE`, re-checking state).
  Inserts and resets take only the loan row.
- **Exception, stated honestly:** an older page's void is a plain `UPDATE`, so Postgres has already locked the activity row
  before the trigger locks the loan (activity → loan). If that coincides with a current-frontend void of **the same entry**
  (loan → activity), Postgres detects the deadlock and aborts one side cleanly. No partial effect is possible; the aborted side
  sees an error and can retry, and the survivor's result stands. This is covered by test 2.
- **Expected results:** C1 = 850, C2 = 150, C3 second disbursement refused, C4 second payment refused, C6 = 1950.
  C5 = 900/130 and C7 = 2000 are unchanged.

### 2.2 Exact loan linkage for new entries (fixes D3)
- Both activity tables get a nullable `mortgage_id` column referencing `mortgage_details`.
- The insert trigger sets it **server-side** to the locked active loan, the row it actually changes. A client-supplied
  different value is refused.
- This works the same for older browsers, which never send it.
- **Pre-migration rows stay `NULL` = "unlinked legacy property activity".** No backfill, not even from timestamps.

### 2.3 Immutable facts, one-way void, audit (fixes D5)
- **Immutable after insert:** date, type, amount, principal, interest, property, `mortgage_id`. Any change is refused.
- **The only state change** is `voided false → true`, with `voided_at`, `void_reason` and `void_outcome`.
  - Un-void is refused.
  - A repeated void is an idempotent no-op.
  - Corrections are made by voiding and recording a new entry.
- **Append-only `mortgage_balance_effects`** (security-definer writes only; members may read):
  - columns: `mortgage_id`, `source_kind`, `source_id`, `effect`, signed `principal_delta`/`escrow_delta`, epochs, `reason`,
    `created_by`, `created_at`;
  - effects: `applied` / `reversed` / `reversal_skipped` / `reset` / `void_refused`;
  - a unique `(source_kind, source_id, effect)` key means a reversal can never apply twice.
- **Both activity tables are added to `audit_log`.**
- **Provenance limit (stated honestly):** `changed_by` and `source` identify the **authenticated session** (for example
  "owner session"). They don't identify the human operator or prove which screen or API path was used.

### 2.4 Resets: absolute-reset detection (fixes D4; covers same-value submissions and stale forms)
Each loan gets:
- `balance_version` (bigint), incremented by **every** principal or escrow change: entry, reversal or reset;
- `principal_epoch` / `escrow_epoch`, incremented **only** by a reset of that balance.

**Current frontend: an explicit reset function, `reset_mortgage_balance(loan, principal?, escrow?, statement_date?, expected_version)`.**
- **Intent is explicit:** the form calls it only when the user changes a balance field, or explicitly confirms the balance
  from a statement. Ordinary edits (lender, loan number, rate…) **omit the balance columns entirely**.
- **Same-value submission with intent** (e.g. "confirmed against the Sep 30 statement: unchanged") **is** a reset. The epoch
  is bumped and the effect recorded with its statement date. That's because it asserts that everything before it is already
  reflected in the balance.
- **Stale form:** if `expected_version` ≠ the locked `balance_version`, the reset is **refused** with "The balance changed
  since you opened this form (a payment or another edit). Reload and check it against your statement." This covers T3 C7's
  absorbed payment and C6 for current clients.

**Older browsers: a plain `UPDATE` that always resends both balances.**
- A `BEFORE UPDATE` trigger treats a **changed** value (`IS DISTINCT FROM` the locked value) as an **unverified absolute
  reset**:
  - epoch bump;
  - an effect with reason `legacy_form_reset`;
  - an Action Queue review item (§2.6): "Balance changed by an older page. Check it against your latest statement."
- An **unchanged** resend isn't a reset. The trigger can't tell an intentional "confirm unchanged" from a passive resend,
  so it counts as no-op.
- **Limits for older browsers:**
  1. A stale old form **can still overwrite** a balance (no version token is sent). It's recorded and flagged for review,
     but not prevented.
  2. An intentional same-value confirmation from an old form isn't recorded as a reset.
  3. Both limits end when the page is reloaded onto the current frontend. Hard prevention for old pages would require
     refusing direct balance updates. That would also block their non-balance edits, so it's offered as a decision (§4).

### 2.5 Void rules: the conditional reversal (fixes D2)
Every void runs the same logic, whether it comes from the current frontend's `void_mortgage_activity(id, reason)` or an older
browser's `UPDATE … voided = true` (handled by the trigger). The outcome is stored on the row (`void_outcome`) and in effects.

| Situation | Entry | Balance | Outcome | Review item |
|---|---|---|---|---|
| Linked, loan active, no reset of that balance since the entry | voided | exact recorded delta reversed | `reversed` | none |
| Linked, but **a reset of that balance happened after the entry** (epoch moved), whether manual, statement or older-page reset | voided | **not reversed**: the reset may already include or exclude it, and isn't guessed | `skipped_reset_after_entry` | **yes** |
| Linked, but **the loan is inactive** (voided or replaced) | voided | inactive loan **frozen**; replacement **never touched** (linkage by id) | `skipped_loan_inactive` | none by default; see decision |
| **Unlinked legacy** (`mortgage_id IS NULL`) | voided | not adjusted (which loan it affected isn't recorded) | `skipped_unlinked_legacy` | **yes**, when the property has an active loan |
| **Escrow deposit whose reversal would make escrow negative** | **not voided** | unchanged | `refused_negative_escrow` | **yes** |
| Payment whose reversal would exceed the original loan amount | not voided | unchanged | `refused_over_original` | yes |

- Principal and escrow are judged separately. A payment's principal reversal and its absence of escrow are independent; a
  principal reset doesn't block an escrow reversal.
- **Inactive loan, reports:** inactive loans are already excluded from balance-sheet liabilities (`voided = false` filter),
  and Cash Flow already excludes voided payments. Freezing therefore changes no report.

### 2.6 Action Queue review item (not a Mortgage-screen warning only)
- **Kind:** "Mortgage balance review". **One open item per loan** (or per property, for unlinked legacy items with no linked
  loan). New causes are **appended to the same open item**; there's never a second parallel item.
- **Contents:** each cause (the entry, the date, the outcome above), the current stored balance, and the action: compare with
  the latest statement, then either confirm (closing the item) or reset from the statement (the reset closes it and is itself
  recorded).
- **The same item kind** is reused for `legacy_form_reset`.
- It's separate from the monthly review task (§2.8), but the monthly task links to any open balance review for its loan.

### 2.7 Refused negative-escrow reversal: atomic and truthful
**Current frontend (`void_mortgage_activity`)**, in one transaction:
1. lock the loan, then the activity;
2. compute the reversal;
3. if escrow would go below 0: **leave the entry not voided**, write a `void_refused` effect, create or append the review item,
   commit, and **return `{outcome: 'refused_negative_escrow', review_item_id}`**.

The UI shows: "Not voided. A later disbursement used this deposit. Void that disbursement first, or reset escrow from a
statement. A review item was added to the Action Queue." The void is never shown as successful, and the refusal and the
review item commit together.

**Older browsers (direct `UPDATE voided = true`):**
- the trigger **raises** the refusal (`ZM5M3`, the same wording);
- the whole statement rolls back: entry unchanged, nothing recorded;
- the old page shows the message through its existing error handling.

**Limit:** an aborted transaction can't keep a review item, so **old pages get the message but no Action Queue item**. The next
void attempt from the current frontend creates it. The alternative, silently keeping the row unvoided while returning
success, was rejected as misleading.

`refused_over_original` follows the same pattern.

### 2.8 Monthly review (owner direction): one schedule-driven task per loan per period
- When a loan has a review schedule, the Action Queue holds **one task per loan per period** (for example "Fifth Third ·
  October 2026"), created when the period opens. A unique `(loan, period)` key prevents duplicates.
- A **missing payment confirmation keeps that same task open** with the reason. It never spawns another task.
- The task completes when the period's payment is confirmed (statement or bank) or explicitly marked not applicable.
- The autopay schedule only predicts the expected entry. It **never** confirms a payment.

### 2.9 Loan-specific activity and unlinked property history
- The **History** box shows the active loan's linked entries.
- Unlinked legacy rows, and rows linked to an inactive loan, appear only under "Show voided / earlier activity".
- **Wording is generic unless a loan link exists:** "Earlier entry, not linked to a loan". A lender name is shown only for
  `mortgage_id`-linked rows.

## 3. Migration and data impact (proposed; not applied)
**One forward migration** (plain push; dated after the latest applied):
- `mortgage_id`, `void_reason`, `void_outcome` columns;
- `balance_version` and the two epochs;
- `mortgage_balance_effects`;
- locked insert triggers; void, immutability and reset triggers;
- the `void_mortgage_activity` / `reset_mortgage_balance` functions;
- the review-item kind;
- the `audit_log` extension.

**Data impact:**
- no existing activity row, balance or loan changes;
- legacy rows stay `NULL` with no outcome;
- Test Bank stays frozen with −444 / +800 as entered (voided; excluded from reports);
- Fifth Third is untouched.

**Rollback:** restore the `c15733c` trigger bodies and drop the new functions and triggers. Columns, effects and review items
are **kept**, and reversals already made stay correct. **A frontend rollback is not a database rollback.**

**Dependencies:**
- **T2:** confirm no Financials or reports reader depends on `mortgage_details.updated_at` semantics or the activity
  tables' mutability. Agree the Balance Sheet keeps reading the stored balance.
- **Action Queue owner:** the review-item kind and its read path.
- **T3:** reproduction reused (§4); contract review.
- **E2/F1:** independent. This changes no `financial_transactions` path.

## 4. Focused tests (disposable Postgres 17, `authenticated`; to be built with the implementation)
1. **T3's C1–C7, reused as provided** (`run.sh` method: session A holds 2 s, session B starts at 0.7 s). Run against the
   correction, they must give C1 850, C2 150, C3 and C4 the second refused, C5 900/130, C6 1950, C7 2000.
   - The live-mode run stays the negative control (5 wrong).
2. Void races: concurrent double void reverses once; void ‖ payment on the same loan gives a consistent final balance.
3. A reset after the entry, by each path (current reset function; older-page absolute update), gives `skipped_reset_after_entry`
   plus **one** review item; a second skip appends to the same item.
4. **Same-value reset with intent** bumps the epoch, so a later void skips. An **older-page unchanged resend** doesn't bump it,
   so a later void reverses.
5. **Stale current-frontend form:** a payment after the form loaded means the reset is refused, with no change.
6. **Inactive loan:** payment on A → A voided → B created → void the payment: A frozen, B untouched, `skipped_loan_inactive`.
7. **Unlinked legacy void:** flag only, review item if an active loan exists.
8. **Escrow:**
   - deposit / void deposit reverses;
   - deposit → disbursement → void deposit gives the current frontend `refused_negative_escrow` (not voided, review item
     committed) and the older page `ZM5M3` (not voided, nothing recorded);
   - void disbursement then deposit both reverse;
   - an overdrawing disbursement insert is refused under concurrency (C3).
9. Over-original payment void refused, same pattern.
10. Immutability: fact edits and un-void refused; clients can't write effects; cross-account reads denied; audit rows exist
    for void and reset.
11. **Migration on a copy shaped like the Sep 15 data:** zero row or balance changes; legacy rows `NULL`.

## 5. Recovery limits (honest)
- **Not retroactive:** past lost updates or unreversed voids aren't repaired. A read-only detection query (each audited trigger
  change vs. its entry, as T3 suggested) is proposed separately and hasn't been run. Any correction is a separate, approved,
  audited step.
- **Older browsers:** they can still overwrite a balance from a stale form (recorded and flagged, not prevented), and they get no
  review item on a refused void (message only). Both end on reload.
- **Resets are trusted:** after a reset, earlier entries are never reversed automatically; a person reconciles via the review item.
- **Rollback** returns the old defects for new activity. Recorded effects stay.

## 6. Owner decision (short)
**Conditional reversal:**
- **The rule:** a void reverses an entry's effect only when the entry is linked to the active loan and no balance reset has
  happened since.
- **Otherwise it never guesses.** It either skips and opens an Action Queue balance review (reset since the entry, or an
  unlinked older entry), or refuses and opens a review (escrow would go negative, or above the original amount).

Please confirm, or choose otherwise, on:
1. **Inactive or replaced loans:** freeze (recommended; no report effect, no review item), or also open a review item.
2. **Older pages editing balances:** allow, but record and flag every changed value (recommended), or refuse direct balance
   edits from older pages (safer, but blocks their other loan edits until reload).
3. **Over-original payment voids:** refuse with review (recommended), or allow with a warning for revolving or
   negative-amortization loans.
