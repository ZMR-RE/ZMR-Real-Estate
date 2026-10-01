# Mortgage balance integrity: implementation record (T1, 2026-10-01, revision r3)

**Approval:** the owner, via planning: *"Yes, build the mortgage integrity fix with those choices."*
- Inactive or replaced loans are frozen, with no review task solely for being inactive.
- Older pages can't change balances (reload).
- Reversals above the original loan amount are refused with a review.

**Status:** built and technically verified on disposable local databases. **Not** applied to Practice or production; not
visually reviewed; not released.

**Candidates:**
- **Reviewed (unchanged):** `t1/mortgage-integrity` @ `8f18f77` (code `e13340e`). T3 reviewed it (F1–F4 / B1–B4).
- **r2 (reviewed by T3):** `4290a08` (evidence `e62dff1`). T3's verdict: B1–B4 closed, plus C1 (fix before Practice) and
  R1/R2 (recovery drafts). Source: `evidence/t3-review-r2-C1-R1-R2/`.
- **Fixed (this revision, r3):** `t1/mortgage-integrity-r2` HEAD. Exact hash in the report. The change since `4290a08`
  is limited to C1, R1, R2 and the hint wording (§0). Same base: verified live `origin/main`
  `4f696c3` (Agents, deploy `6abeb18a…`, 110 migrations). Agents preserved.

**T3 sources (retained):**
- `evidence/t3-design-review-M1-M10/T3-M1-M10-review.txt` (design review of contract `bed4174`);
- `evidence/t3-implementation-review-F1-F4/` (both texts on `e13340e`);
- `evidence/t3-mortgage-concurrency-2026-10-01/` (C1–C7 reproduction).

All have provenance and SHA-256.

## 0. Disposition: T3 review of r2 `4290a08` (C1, R1, R2)
| # | Finding | Disposition in r3 |
|---|---|---|
| C1 (before Practice) | A voided entry could keep a stale "still active" / "possibly covered" cause when its void was a skip | **Fixed.** New internal `mortgage_close_entry_causes()` runs on **every** successful void (reversed, reset-skip, inactive loan, unlinked legacy) and closes that entry's open refused and possibly-covered causes as `voided`. A cause explaining a skipped reversal is created afterwards and **stays open**. Tests C1a–C1f, including the requested refused void → reset → successful void |
| R1 (draft) | Re-enable could reverse against a balance edited while disabled | **Fixed in `enable_draft.sql`.** The disabled period is treated as an **unknown reset** on every active loan: both reset counters and both version counters move, statement dates become unknown, figure-entered times become now, and a `reset` effect with reason `re_enable` is recorded. `recovery.sh` covers disable → direct balance edit → enable → void of a pre-disable entry, which gives `skipped_reset_after_entry` plus a review cause, not a reversal. Optional: the disable now **keeps the no-delete triggers** |
| R2 (draft) | A plain revert would delete the applied migration from `main` | **Fixed.** Recovery is **application-only**. `supabase/recovery/mortgage_integrity/frontend_scoped_revert.sh` restores only the release's application files to the live base, keeping `supabase/**`, `docs/**` and root `*.md`. It refuses a dirty tree or later edits to those files, makes one local commit, and never pushes. Reintroduction is by reverting that commit. `frontend_revert_rehearsal.sh` checks: refusals, preservation, later unrelated work kept, both states type-check, reintroduction exact |
| Hint | The statement date is ignored when balances are unchanged | **Clarified** on the form: the date is used only when a balance is changed there; unchanged-balance confirmations use "matches my statement" in the Action Queue |

**T3's minor notes, not changed in this batch:**
- one statement-date input sits above all loans in the review item;
- review amounts are shown without currency formatting;
- the opening effect records only the principal statement date;
- the UTC date cutoff and the `updated_at` backfill can flag slightly more (both err towards flagging).

These are listed for a later presentation pass; no redesign here.

**Recovery drafts remain unapproved,** pending T3's recovery assessment.

## 1. Disposition: T3 implementation review of `e13340e` (F1–F4 = B1–B4, required for the Practice test)
| # | Finding | Disposition in r2 |
|---|---|---|
| F1/B1 | Recovery left the database inconsistent ("reverted" repair, audit triggers dropped) | **Implemented.** Down script and "reverted" step **removed**. Primary recovery is **frontend-only**, with the degraded mode documented (`supabase/recovery/mortgage_integrity/README.md`). A database disable or re-enable is a **draft forward migration** (`disable_draft.sql`, `enable_draft.sql`) to one defined state: both recorded as applied, objects and data retained, activity audit triggers kept. **Unapproved, pending T3's recovery assessment.** Tested: `recovery.sh` 10/10; the control run uses the disable draft |
| F2/B2 | A review confirmation could clear causes the owner never saw | **Implemented.** `reset_mortgage_balance(…, p_resolve_cause_ids)` resolves **only the ids passed** (the Action Queue passes exactly the ids it displayed), only for that loan and the balances updated. Edit-path resets pass none. Unlinked legacy causes need an explicit acknowledgement. Tests F14a–d, M2/M2b, H4 |
| F3/B4 | Historical entries after a statement reset | **Implemented as T3 reframed it, and as planning instructed.** Every entry is **applied as today**. An entry dated on or before the balance's latest statement date (or, when none was given, the date the figure was entered) **also raises a review cause**. Nothing is skipped or guessed. The app now **sends statement dates**: an optional "Statement date for these balances" on the mortgage form (stored as the as-of date on create, or sent with a balance update) and on the review's confirmation. **Deliberately different on one point:** when no statement date is given, it isn't *stored* as today. As-of stays unknown, per the owner/planning rule never to default an unknown historical date, and the flag falls back to the figure-entered date, which gives the same detection. Tests H1–H7 |
| F4/B3 | Review items lacked context | **Implemented.** Each cause stores its context when created: entry date, type, amount or principal, when recorded, when the balance was last updated, and the statement date. The item shows it. Refused causes say **"Not voided … is still active"** plus the next step, with an "Entry still active" badge. The confirmation says it closes only the listed items. Tests B3, B3b; unit tests `describeCause` |

**Optional items T3 listed, all done in r2:**
- M7: separate principal and escrow versions (test M7, M7b).
- 40P01: a friendly "Changed at the same time … nothing was saved. Try again." (unit test). Postgres's clean abort is proven by forced-deadlock test R12.
- current_user hardening: the loan guard is SECURITY INVOKER and refuses client-role balance changes. Test S2b.
- Opening balances: recorded as an initial reset effect (test M1).

## 2. Disposition: T3 design review M1–M10 (against contract `bed4174`)
| # | Status | Notes |
|---|---|---|
| M1 older pages refused by write path | **Implemented, deliberately narrower; T3 assessed it as safe.** | The balance guard runs with the caller's rights and refuses a **changed** balance from a client role. An unchanged resend plus other edits is allowed, isn't a reset, and is compared with the locked latest row, so no stale overwrite is possible. Older pages' inserts are linked; their voids run the same conditional core. Opening-balance effect added |
| M2 per-balance, seen-only resolution | **Implemented** | See F2. Causes raised during review stay open (F14b/c) |
| M3 confirm = reset | **Implemented** | Same-value update; the reset counter moves; statement date recorded when given |
| M4 database dedup, no checkbox bypass | **Implemented** | Derived from cause rows; unique open (entry, cause); no `action_items` row, so generic completion can't hide it (M4, M4b). Monthly tasks are explicitly **out** of this batch |
| M5 historical entries | **Implemented per the F3 reframing** | Default statement date "today" not stored (see F3) |
| M6 repeated refusals | **Implemented** | `void_refused` excluded from the once-only index, and recorded once per open cause (F11d) |
| M7 per-balance versions | **Implemented** | M7, M7b, V1, V2 |
| M8 lock order, deadlock | **Implemented** | Loan before entry on every controlled path. A legacy void locks the property's active loan (M8 test). The one cycle (an older-page void racing a current void of the same entry) is broken cleanly by Postgres (R12), and the current app shows a friendly retry message |
| M9 audit constraint | **Implemented, additive** | Built from the live constraint's own list, so a name another migration adds is preserved (preservation test). The insert trigger's backfill pauses the audit trigger so existing history gains no rows |
| M10 test expectations | **Implemented** | 86 cases (below) |

**Not changed, and noted for the owner (not regressions):**
- Any member (not only an owner or manager) may update balances. This is the same as today's mortgage-table permissions; restricting it is an owner choice.
- `audit_log` accepts direct member inserts. That's a pre-existing, cross-cutting gap. The effects table, which has no client writes, is the authoritative record.

## 3. Scope (files)
- **Database:**
  - `supabase/migrations/20261004100000_mortgage_balance_integrity.sql`;
  - recovery drafts in `supabase/recovery/mortgage_integrity/`;
  - tests in `supabase/tests/mortgage_integrity/` (`run.sh`, `migration_preservation.sh`, `recovery.sh`).
- **Mortgage module (T1):**
  - queries, details, payments and escrow hooks;
  - lists;
  - `MortgageDetailsForm.tsx`: the optional statement-date field, a **visible form addition** listed for owner visual review;
  - `mortgageBalanceIntegrity.ts` (+ test).
- **Review module (T1):** `src/modules/mortgageBalanceReview/*`, plus +3 lines in `actionQueue/ActionQueueBoard.tsx` (T2 released its hold; no T4 change there).
- **Audit display (T1, unowned module):** `auditLog/auditLogQueries.ts`, `auditLogFormatting.ts` (+ test) and `useAuditLog.ts`. Payment and escrow audit rows are now shown; internal counters are hidden.
- **Financials:** no file touched. T2's `0c2b275` confirms Financials only reads these tables.

## 4. Evidence (r2, disposable local Postgres 17 + app checks)
| Run | Result |
|---|---|
| `run.sh` | **92 passed, 0 failed** (r3 adds C1a–C1f) (concurrency R1–R12 including the forced deadlock; linkage; immutability; one-way void; older-page paths; resets and versions; inactive loan; legacy; escrow refusals; over-original; per-balance and seen-only resolution; historical flags; review context; authorization and hardening; audit) |
| `run.sh --control` (disable draft applied) | **49 failed**: reproduces T3's C1–C4/C6 and the missing protections |
| `migration_preservation.sh` | 8/8: md5 of all existing loans, entries and audit rows unchanged; balances identical; legacy unlinked; no history effects; statement dates unknown; figure time = row's last write; another migration's audit name kept |
| `recovery.sh` | disable keeps objects, data, audit and no-delete triggers and restores pre-integrity writes; enable (R1) treats the disabled period as an unknown reset; a pre-disable entry then skips with a cause; entries made while disabled void as unlinked legacy |
| `frontend_revert_rehearsal.sh` | R2 scoped application-only revert and its reintroduction |
| T3's original `run.sh` (live) | 5 wrong, unchanged |
| App | tsc clean, build clean, vitest 215/215, oxlint 79 = baseline |

## 5. Migration order (corrected wording)
- `20261004100000` is newer than every applied migration and than T4 Stage 1's unreleased `20261002100000…20261002160000`.
- **If Stage 1 ships first:** the mortgage pending set is exactly `20261004100000`, a plain push, re-prepared on the new `main`.
- **If mortgage ships first:** Stage 1's nine versions become older than an applied one, so **Stage 1** needs the exact-set
  `--include-all` procedure, which its own procedure already contains. Mortgage itself never needs `--include-all` in either order.

## 6. Bounded hosted Practice checklist (only after T3 clears the fixed commit, in a coordinated window; no sign-in requested yet)
**Holder and window:** T1, recorded in the assignments file (start time, intended mutations below). One writer. Hand back
afterwards.

**Exact pending-migration inventory (read-only first; stop on any difference):**
- Practice was last reported at **119**: production's 110, plus T4 Stage 1's nine `20261002100000–20261002160000`.
  - This isn't assumed. Read `migration list` at the window's start.
  - Any applied version outside those 119 (for example older Capture `20260930120000/130000`, if they were ever applied
    there) is a stop and report.
- Apply from a **scratch checkout** of the fixed commit that also mirrors, at their exact applied content, every
  Practice-applied version the candidate lacks (T4's nine, pinned as in T4's `s1_pin_versions.py` method).
- **Pending must be exactly `20261004100000`.** It's the newest, so it's a plain apply (no `--include-all`). Dry run first.
- Record the count before and after: expected 119 → 120.

**Fixture ownership:**
- One T1-owned fictional property `ZMR-TEST-T1-INTEGRITY …` and its loan, under the Practice test account, created via
  the dashboard by the **reserved test identity**.
- Other terminals' fixtures (T2 `ZMR-TEST-T2…`, T4 `ZMR-TEST-S1/R2…`, existing `ZMR-TEST-PRACTICE`) are read-only for this test.

**Steps (hosted):**
1. Reset and void functions return the expected outcomes: reversed, skipped, refused (the entry stays active), already voided.
2. The embed hint `mortgage_details!review_mortgage_id` loads in the Action Queue.
3. Using a `4f696c3` build for older-page behaviour:
   - an unchanged-balance save is allowed;
   - a changed balance is refused with the reload message;
   - a void reverses;
   - a refused void shows its message.
4. The review item shows full context; partial resolution works (principal confirmed, escrow stays open; a cause raised
   meanwhile stays open).
5. Statement-date flag: update with a statement date, then add an entry dated before it, which is applied and flagged.
6. The property audit trail shows the payment and escrow rows.

Not needed hosted: concurrency (local evidence) and recovery (local evidence).

**Expected permanent residue (immutable by design):**
- the fixture's payment and escrow rows (voided, not deletable);
- their `mortgage_balance_effects` rows;
- resolved review causes;
- audit rows;
- the fixture property and loan (the loan voided at the end).

**Preservation checks:**
- Before and after: md5 of every pre-existing `mortgage_details`, payment and escrow row **not** owned by this test, and of
  T2's and T4's fixtures.
- Counts of their effects and causes (expected 0 new).
- Migration count 120, nothing else pending.
- Sign the test identity out; stop the dev server; hand Practice back.

**Recovery for the test itself:** only through the F1 forward drafts, if approved. Never a "reverted" repair.

## 7. Not authorized
Any migration on Practice or production, a `main` push, deployment, or historical correction.
