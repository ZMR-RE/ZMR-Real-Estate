# Option B (H2) recovery: DRAFTS, NOT APPROVED (T1)

**Nothing here is applied anywhere.** The H2 migration is `20261005100000_mortgage_history_entries.sql`; it is never removed.

## Release order (contract v5 §6)

H1 (T2, the Reports-only frontend) must be live **before** H2. H2's immediately prior verified deploy is therefore H1.

## Primary recovery: frontend only (database kept)

1. **Emergency:** republish H1's deploy (only if nothing newer shipped).
2. **Git:** `supabase/recovery/mortgage_integrity/frontend_scoped_revert.sh <checkout> <H2 release commit> <H1 commit>`.
   - It restores H2's application files to H1.
   - It keeps `supabase/**` (this migration, its tests, these drafts) and `docs/**`.
   - Locked and unlocked publication follow the integrity release packet's G/R procedure, with G = H1's deploy.

**Never:**
- `migration repair --status reverted`;
- dropping or altering the history tables or their rows;
- a plain `git revert` of the release.

## Degraded mode after rolling H2 back to H1 (T3 condition 5)

| Behaviour | What happens |
|---|---|
| History entries already recorded | **Kept and unchanged.** H1's Reports still read `mortgage_history_payments` and **don't deduct** them from cash (R2), with the disclosure. H1 doesn't show history rows on the Mortgage tab (that's H2 / T2's later presentation) |
| New history entries | **Can't be created:** H1's frontend has no history choice |
| Duplicate protection | **Stays fully on in the database** (the H2 triggers remain). A normal entry identical to any existing normal, history or unlinked entry on the same loan/property is refused `ZM5MA`, with the reload message |
| Confirming a genuine separate payment | **Not possible from H1's frontend**: it can't send the confirmation. A genuine **separate same-day, same-total payment must wait for the roll-forward to H2**, then be recorded with "Record anyway". Nothing is lost; the user simply can't record it until then |
| Voids | Normal entries: unchanged (integrity rules). History entries: H1 doesn't show them, so they can't be voided until roll-forward |
| Balances | Unaffected: history entries never touch a balance |

Pages opened before the roll-back behave the same until reloaded.

## Database neutralisation (only if H2's database part itself must be switched off)

- `disable_draft.sql` blocks **new** history inserts. It keeps every row, the duplicate rule and the audit triggers.
- To use it: review and approve, copy it into `supabase/migrations/` under a new timestamp, and apply it with the exact-set procedure.
- To re-enable: drop that trigger in another reviewed forward migration.
- Existing history rows stay excluded from cash under H1's R2 either way.
