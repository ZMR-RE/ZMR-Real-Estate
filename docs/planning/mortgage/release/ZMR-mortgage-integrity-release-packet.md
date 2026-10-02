# Mortgage balance integrity: release packet v3 (T1, 2026-10-02). PREPARED, NOT AUTHORIZED

> **v3: re-baselined onto live `90abc8a`** (deploy `6abf2f38db19970008251e2c`, 119 migrations; billing/tenant and dropdown changes preserved). Supersedes v2 (`9a904f8`, base `d9cdcb3`). The Practice evidence and the database suites/rehearsals stand unchanged (live's migration set is identical to `d9cdcb3`'s).

## 1. Exactly what would ship

| Item | Value |
|---|---|
| **Release commit (R1)** | `6d9bd623558725a2aa8cc19b6d8610663df9c219` (branch `t1/mortgage-integrity-rc2`): a merge of rc `033a474` onto live `90abc8a` |
| T3-cleared lineage | `abf2b35` (integrity, Practice-tested), `f245551` (B-1), `9f1f37e` (partial-save wording) |
| Awaiting T3 | `2113318` (conflict wording), `9f7653c` (conflict message on its own lines) and `033a474` (Action Queue action vs load errors, T3 finding) |
| Migration | Exactly `20261004100000_mortgage_balance_integrity.sql`, blob `b279fcb4…`, **identical to T3-cleared `abf2b35`** |
| Live baseline at preparation | `main` = `90abc8a`, Netlify **G = `6abf2f38db19970008251e2c`**, 119 migrations. `6d9bd62` contains `90abc8a` |
| Application files vs live | 28 (`frontend_scoped_revert.sh` set); `supabase/**` adds the one migration plus its tests and recovery drafts |
| Verification | Fresh clone of `6d9bd62`: tsc -b, build, vitest 354 + 1 (= live 311 + integrity 43), lint 83 (= live's 83); scoped-revert rehearsal 14/14 for (`6d9bd62`, `90abc8a`, 28 files); release-check rehearsal 12/12 (reused: same migration set) |
| Prerequisite | The Sep 15 test-entry cleanup is done (2026-10-02 01:35–01:45 UTC); the preflight re-checks it |

**If another release ships first** (re-check at the release start; **never** drop shipped work):
1. Merge the then-live `main` (call it L) into the integrity branch. That gives a **new release commit**, re-verified: fresh clone, full tests, release-check rehearsal and scoped-revert rehearsal.
2. T3 reviews the **integration delta** only.
3. Update the pins:
   - `RELEASE` in the runner;
   - the scoped-revert **base = L's commit** (the live parent of the merge);
   - **G = L's verified deploy id**;
   - the expected migration count (119 + L's migrations), in the runner, `integrity-release-pre.sql` and `-post.sql`;
   - and therefore their SHA-256 pins.
4. The pending set must still be **exactly** `20261004100000`. If L shipped a later migration, the push needs `--include-all`: a reviewed amendment, not an improvisation.
5. Re-run the owner visual check only for screens L changed.

## 2. Files (pinned)

| File | SHA-256 | Role |
|---|---|---|
| `mortgage-integrity-release.sh` | (in the T3 request) | Owner-run guarded runner. Refuses unless: the clone is at R1 and clean; the migration blob is `b279fcb4…`; the clone is linked to production; there are 120 local files; editing is paused; the named backup's checksum verifies and it's ≤ 3 h old; remote = 119; pending = exactly `20261004100000`; nothing remote-only; the preflight passes; the dry run lists only it. Then a **plain push**, post-checks, and a fingerprint diff |
| `integrity-release-pre.sql` | `5503e14e…` | Read-only. STOP unless: 119; integrity objects absent; the Sep 15 rows absent |
| `integrity-release-fingerprint.sql` | `cf8d0bc0…` | Every existing field of the mortgage tables (new columns excluded by name), the full `audit_log`, and every other public table's count. Taken before and after; must be identical |
| `integrity-release-post.sql` | `cfcd2585…` | Read-only. STOP unless: 120; 5 functions; 11 triggers; RLS on effects and causes; backfill exactly as specified; existing entries unlinked; 0 effects; 0 causes |
| `rehearsal.sh` | — | Local disposable-Postgres rehearsal: 12/12 (GO path, 4 preflight/post STOPs, 2 fingerprint detections) |

**Limit:** the runner's production connection, prompts and Supabase CLI push can't be rehearsed locally. Its SQL can, and was. The pattern matches the reviewed `mortgage-migration-release.sh` (2026-10-01) and the cleanup runner (2026-10-02).

## 3. Window procedure (when approved)

| Step | Who | What |
|---|---|---|
| 0 | Owner | Scoped approval for exactly R1 (or the re-baselined commit per §1), **including §5's recovery authority** |
| 1 | T1 | Check holders, then record **PRODUCTION WINDOW HELD**. Confirm `origin/main` = the expected base, `published_deploy` = G with its lock state recorded, and 119 migrations. Any difference → §1 re-baseline, not this window |
| 2 | Owner | Pause editing; `bash ~/ZMR-Backups-Private/release-b-backup.sh` → VERIFIED |
| 3 | T1 | Prepare a clean clone at R1, linked to production (metadata only). Install the 4 pinned files into `~/ZMR-Backups-Private/` and verify their SHA-256 |
| 4 | Owner | `bash ~/ZMR-Backups-Private/mortgage-integrity-release.sh <clone>`. Must end **DONE** |
| 5 | T1 | Exact-commit push: `git push origin 6d9bd62…:refs/heads/main` (fast-forward from the base; never a docs tip; never forced). Wait for the deploy **S** (`commit_ref` = R1) to reach `ready` |
| 6 | T1 | S's bundle is byte-identical to a clean-clone production build of R1 (`verify-deploy-vs-baseline.py` pattern). Changed vs G: only the expected application bundle. Routes 200; production database only |
| 7 | **Publication** | **Unlocked:** S publishes automatically; checks run live. **Locked** (if G was locked at step 1): S builds but doesn't publish. Check S's permalink; only if every check passes, publish S and record the lock decision (unlock only if it was unlocked before the window) |
| 8 | Owner | Live look (no saving needed): Mortgage tab; Edit shows the statement-date field; Action Queue loads |
| 9 | T1 | Record the window end; editing resumes; then the T2 handover (§6) |

**Any failed check at steps 5–8:** apply §5 (A then B). Keep the window held. No fixes in the window.

## 4. Degraded mode (the previous frontend on the new database)

Per `supabase/recovery/mortgage_integrity/README.md`:
- payments, escrow and voids work (refusals show their message);
- an unchanged-balance save works;
- **a changed balance is refused** with the reload message;
- review items accumulate and reappear on roll-forward.

Older open pages after the release behave the same until reloaded.

## 5. Recovery: G / R (frontend only; the database is never rolled back)

**Names:**
- **G** = the last verified good deploy (now `6abf2f38db19970008251e2c`, `90abc8a`).
- **S** = the integrity deploy.
- **R** = the deploy of the scoped-revert commit.

**Never:**
- `migration repair --status reverted`;
- deleting `supabase/migrations/20261004100000…`;
- a plain `git revert` of the release (it would delete the applied migration file);
- the disable/enable drafts without their own approval.

**One continuous procedure:** the window stays held, and no other release proceeds until B's last check passes.

### A. Emergency republish (only if the live site is broken by S, and only if nothing newer shipped on top of it)

1. Republish **G** (Netlify: publish deploy `6abf2f38…`).
2. Verify:
   - `published_deploy` = G;
   - routes 200;
   - the Mortgage tab is the previous screen.
3. **Record the lock state** (publishing an older deploy can leave auto-publishing locked).

**If a later release shipped on top of R1,** don't republish an older deploy that would drop newer work. Go straight to B, with G = that later release's verified deploy.

### B. Scoped revert on `main` (immediately after A)

1. In a clean checkout of current `origin/main`:
   ```
   supabase/recovery/mortgage_integrity/frontend_scoped_revert.sh <checkout> 6d9bd623558725a2aa8cc19b6d8610663df9c219 90abc8adc1dbd12df6040c45b23deeb52dd336b6
   ```
   - It makes **one** local commit restoring the release's 28 application files to `90abc8a`.
   - It keeps `supabase/**`, `docs/**` and root `*.md`, plus any newer unrelated work.
   - It **refuses** a dirty tree or later edits to those files. Then fix forward with the same scope; don't widen it.
2. **Prove before pushing:**
   - `git diff --name-only HEAD~1 HEAD` lists only those application files;
   - `supabase/` is unchanged, and all 120 migration files are present;
   - a clean clone builds and its tests pass.
3. Push normally (fast-forward, never forced) → Netlify builds **R**.
4. **Checks on R** (`ready`, `commit_ref` = the revert commit):
   - **no later release:** every file IDENTICAL or RENAMED-IDENTICAL to G;
   - **later work exists:** byte-identical to a clean-clone build of the revert commit, with only the integrity bundle changes removed;
   - routes 200; Mortgage tab = previous screen.
5. **Publication, two paths:**

   | State | Path |
   |---|---|
   | **Unlocked** | R publishes automatically; the checks run live. **Any failure:** immediately republish G, verify it, record the lock this creates, stop all pushes to `main`, keep the window held, report |
   | **Locked** (after A, or already) | R builds unpublished. Check R's permalink `https://<R>--zmr-real-estate.netlify.app`. **Any failure:** R stays unpublished, G stays live, the lock and window stay held; report. **All pass:** publish R, **then** unlock auto-publishing (never before R has passed) |

6. **Verify:**
   - `published_deploy` = R (`commit_ref` = the revert commit);
   - auto-publishing **unlocked**;
   - routes 200.
7. **Record:** the incident, G, R, the revert commit and the lock handling in the assignments file. Close the window; editing resumes. Tell T2 and T4.

**Reintroduction later:**
- `git revert <scoped-revert commit>` on then-current `main` (re-merging is a no-op);
- then the fix, a clean-clone verification, T3 review and a new scoped approval.
- No migration is re-applied; it was never removed.

**Rehearsed:** `frontend_revert_rehearsal.sh 6d9bd62 90abc8a`, 14/14 (refusals, `supabase/**` and `docs/**` kept, later work preserved, both states type-check, reintroduction exact).

## 6. After a confirmed release: T2 handover (recorded then, not before)

**Record in the assignments file:**
- the released commit;
- **"files handed to T2"**: `src/modules/mortgagePayoff/*`, `src/modules/properties/PropertyProfileMortgageTab.tsx`, `src/modules/mortgageBalanceReview/*`, and mortgage-scoped CSS;
- the invariants T2 must keep.

**Invariants:**
- refusals in place, with values kept;
- the conflict message's stored-vs-entered figures and three choices;
- Action Queue action errors kept separate from load errors (a refresh never erases them);
- statement dates never defaulted;
- void outcome notes;
- review-item wording;
- partial confirmation (ids passed);
- no direct balance writes.

**Option B is not part of this release.**
