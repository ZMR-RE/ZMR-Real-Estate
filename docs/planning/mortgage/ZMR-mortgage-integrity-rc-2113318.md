# Mortgage integrity release candidate `2113318`: conflict wording (T1, 2026-10-02)

**Candidate:** `2113318aa71555d730ad550308ad8708c439167c` (branch `t1/mortgage-integrity-rc`), one commit on top of `9f1f37e`.
- **Supersedes** `9f1f37e` as the release candidate.
- **Option B is not included and doesn't affect it.**

**Status:**
- **Built** and technically verified (fresh clone).
- **Hosted:** the delta is not yet seen hosted (see Gaps).
- **Visual:** awaiting the owner (§3).
- **Released:** NO; no release authorized.

## 1. For T3: focused delta review (SEND NOW)

**Delta:** `git diff 9f1f37e 2113318`, 4 app files, no `supabase/**` (the migration is byte-identical to `abf2b35`):
- `mortgageBalanceIntegrity.ts`: new `staleBalanceFormMessage`, `STALE_BALANCE_REVIEW_MESSAGE` and `reviewActionError`.
- `mortgageDetailsSave.ts`: the `ZM5M5` branch uses `staleBalanceFormMessage(latest | null, input)`. The server text is never shown.
- `useMortgageBalanceReview.ts`: Action Queue errors go through `reviewActionError`.
- `mortgageDetailsSave.test.ts`: 3 new tests plus updated `ZM5M5` assertions.

**Why:**
- The server's `ZM5M5` text ends "Reload, compare with your statement, then save again."
- On the Mortgage tab, since B-1, the form keeps the user's entries and adopts the stored record; **reloading would discard them**.
- In the Action Queue the list refreshes itself.

**New wording:**

| Where | Message |
|---|---|
| Mortgage tab | "The balance changed while you were editing (a payment, an escrow entry or another edit), so nothing was saved. Your entries are still in the form; no need to reload. Stored now: principal $X, escrow $Y. In this form: principal $A, escrow $B. Check both against your statement. To use the figures in this form, Save again. To keep the stored figures, type them into the balance fields before saving, or Cancel to discard all your changes." |
| Mortgage tab, if the stored figures can't be read | "…The current figures couldn't be loaded just now: copy your entries, then Cancel and reopen Edit to see them." |
| Action Queue | "The balance changed after this review was shown, so nothing was confirmed. The figures below have been refreshed; check them against your statement and confirm again." |

**Please check:**
1. Every `ZM5M5` path maps, and no other code's text changes. `40P01`, `ZM5M7` and other errors keep the existing mapping (tested).
2. "Save again" is a deliberate overwrite, versioned against the **adopted** stored record (tested: the reset quotes the adopted version).
3. The statements in the message are true at that moment: nothing committed, and the figures are the adopted record and the form's values.

## 2. Evidence

**Fresh `--no-local` clone of `2113318`:**
- `tsc -b` clean; build clean;
- vitest **317 passed + 1 skipped** (`9f1f37e`: 314 + 1);
- oxlint 83 warnings (the baseline);
- contains live `d9cdcb3`;
- `supabase/**` unchanged since `abf2b35`.

**Browser, SIMULATED backend** (port 5186 harness, the real Mortgage tab code; the conflict was injected using the **exact server text**):
- **Desktop 1400 × 852:** `evidence/rc-2113318-conflict-wording/C1-desktop-conflict-message-simulated.jpg`
- **Phone 390** (same-origin frame, `scrollWidth` 386 = width): `C2-phone390-conflict-message-simulated.jpg`
- **Results:**
  - the message shows stored $149,000.00 vs entered $148,000.00;
  - the lender edit is kept;
  - **Save again** → one reset plus one details update, version advanced, form closed (deliberate overwrite).

**Gaps:**
- **Not seen hosted:** the new wording hasn't been seen on Practice. The hosted path that reaches this branch was proven real on `9f1f37e` (R2); only the text changed. **No new hosted window is requested** unless T3 or the owner asks.
- **Action Queue wording:** unit-tested only; no capture.

## 3. Owner visual review (refreshed and audited)

**Audit:**
- Every file below exists at the stated path.
- Each shows behaviour this delta does not change, except **C1/C2**, which show the new wording.
- No capture shows the old "Reload" text.
- Several earlier desktop captures render only part of the page (a tooling limitation).

| # | What to look at | File |
|---|---|---|
| 1 | **New:** conflict message, desktop | `t1/mortgage-integrity-rc`: `evidence/rc-2113318-conflict-wording/C1-desktop-conflict-message-simulated.jpg` (simulated backend) |
| 2 | **New:** conflict message, 390 px (long, about 12 lines; each sentence is a choice) | `t1/mortgage-integrity-rc`: `evidence/rc-2113318-conflict-wording/C2-phone390-conflict-message-simulated.jpg` (simulated backend) |
| 3 | Refused save keeps values (real hosted refusal) | `t1/mortgage-integrity-b1`: `evidence/b1-practice-recheck-9f1f37e/R1-desktop-real-refusal-form-kept.jpg`, `F2-phone390-R1-real-refusal.png` |
| 4 | Partial-save wording (simulated failure, real backend) | `…/R4-desktop-partial-save-40001-simulated.jpg`, `F2-phone390-R3-partial-save-simulated.png` |
| 5 | Mortgage tab view mode (real app frame) | `…/F1-desktop-view-real-app-frame.jpg`, `F2-phone390-view.png` |
| 6 | Statement-date field and hint | `t1/mortgage-integrity-final`: `evidence/practice-hosted-abf2b35/D5-desktop-edit-statement-date-field.jpg` |
| 7 | Action Queue "Mortgage balance review" | `…/D1-desktop-action-queue-refused-and-flagged.jpg`, `D2-…before-partial-confirm.jpg`, `P1-phone390-action-queue-review.png` |
| 8 | History / audit list | `…/D3-desktop-property-history-audit.jpg` |

**Reply:** Accept, or Changes with the item number. In particular, is the phone length of item 2 acceptable?

## 4. Release packet

Unchanged from `ZMR-mortgage-integrity-release-packet.md` (`abe015f`, branch `t1/mortgage-integrity-b1`), with the **release commit = `2113318`**. That covers:
- the frontend scoped-revert pin;
- the exact-commit push;
- the clean-clone bundle comparison.

**No production release is authorized.**
