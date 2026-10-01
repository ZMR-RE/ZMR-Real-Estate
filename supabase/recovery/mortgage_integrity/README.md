# Mortgage balance integrity: recovery (T1). DRAFTS, NOT APPROVED

Pending T3's recovery assessment and explicit owner approval. **Nothing here is applied anywhere.**

## Primary recovery: frontend only
Republish the immediately prior frontend deploy, then make a normal scoped revert on `main`. The database stays as it
is: `20261004100000` remains applied, with all its objects, data and audit triggers.

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
  - Entries recorded while the rules were disabled have no loan link and no effect rows.
  - On void they behave as unlinked legacy entries: no reversal, plus a review cause.
- The same rule applies to Practice.
- Both drafts are exercised by `supabase/tests/mortgage_integrity/run.sh --control` (disable) and `recovery.sh`
  (disable, then enable).
