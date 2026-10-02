# Mortgage balance integrity: recovery (T1). DRAFTS, NOT APPROVED

Pending T3's recovery assessment and explicit owner approval. **Nothing here is applied anywhere.**

## Primary recovery: frontend only (application files only)
1. **Restore the site:** republish the immediately prior frontend deploy, the one live before the mortgage release.
2. **Fix `main` with a scoped application-only revert,** using `frontend_scoped_revert.sh`. **Never** use a plain
   `git revert` of the release: that would delete the applied migration `20261004100000`, its tests and these drafts from
   `main` while the migration stays applied.
   - Run `frontend_scoped_revert.sh <checkout-on-current-main> <release_commit> <live_base_commit>`.
   - It restores only the application files the release changed, back to the live base. It keeps `supabase/**`,
     `docs/**` and root `*.md`, and all newer unrelated work.
   - It makes one local commit, never pushes, and refuses a dirty tree or any later commit touching those files. If it
     refuses, fix forward with the same scope.
   - Then push normally as a fast-forward.
3. **Reintroduce** later only by reverting that scoped revert commit.

The database stays as is: `20261004100000` remains applied, with all its objects, data and audit triggers.
Rehearsed by `supabase/tests/mortgage_integrity/frontend_revert_rehearsal.sh`: refusals, `supabase/**` and `docs/**`
kept, later work preserved, both states type-check, and reintroduction exact.

**Degraded mode for the pre-integrity frontend on the new database:**
- Logging payments and escrow entries **works**. Entries are linked on the server, locked and applied, and flagged for
  review when they're historical.
- Voiding entries **works**. The plain update runs the same conditional core: it reverses when safe, otherwise skips
  with a review cause, and a refusal shows its message.
- Editing loan details **works**, as long as the balance fields are unchanged.
- **A changed balance is refused** ("page is out of date"), so balances can't be corrected until the integrity frontend
  is restored.
- The Action Queue review item and the outcome notes aren't visible (that frontend doesn't have them). Causes keep
  accumulating and appear again on roll-forward.

## Database disable/re-enable (only if the database rules themselves must be switched off)
- **Never** use `supabase migration repair --status reverted 20261004100000`. Its objects stay, so migration history
  would contradict the database.
- **To disable,** copy `disable_draft.sql` into `supabase/migrations/` under a **new** timestamp after review and approval,
  and apply it with the normal exact-set procedure. The resulting defined state:
  - `20261004100000` and the disable migration are both recorded as applied;
  - all new columns, tables, effects, causes and audit rows are retained;
  - the activity-table audit triggers are kept;
  - balance writes go back to the pre-integrity triggers;
  - the frontend is the pre-integrity build.
- **To re-enable,** use `enable_draft.sql` the same way: another forward migration with a new timestamp.
  - **R1:** it treats the disabled period as an unknown reset of both balances on every active loan, because balances
    may have been edited directly while the rules were off:
    - both reset counters and both version counters move;
    - statement dates become unknown and the figure-entered times now;
    - a `reset` effect with reason `re_enable` is recorded.
    - So no pre-disable entry is ever reversed against a figure a person may have replaced. Its void skips and raises a
      review instead.
  - Entries recorded while the rules were disabled have no loan link and no effect rows. On void they behave as unlinked
    legacy entries: no reversal, plus a review cause.
- **The disable keeps the no-delete triggers,** which protect the effects record and cost nothing for the pre-integrity
  frontend.
- The same rule applies to Practice.
- Both drafts are exercised by `supabase/tests/mortgage_integrity/run.sh --control` (disable) and `recovery.sh`
  (disable, then enable).

## After option B (H2, `20261005100000`) is applied: do NOT use `disable_draft.sql` as it stands

- `disable_draft.sql` drops the integrity insert triggers on `mortgage_payments` and `mortgage_escrow_transactions`.
- After H2, those same insert functions also carry the **duplicate rule** (the one added line).
- Using this draft after H2 would therefore **remove duplicate protection from normal inserts**: identical entries, including ones matching history entries, would no longer be refused.
- History inserts would still be checked by their own triggers.
- If a database disable is ever needed after H2, the draft must first be **revised and re-reviewed** to keep a duplicate check on normal inserts (or the duplicate loss explicitly accepted by the owner). See `supabase/recovery/mortgage_history/README.md`.
