# Billing + tenant release: scoped recovery rehearsal (T4, 2026-10-02)

**Scope:** a local scratch clone only (its remote removed). Nothing was pushed, fetched or deployed, and no account or database was touched.

**Finding R1** (T3): this release isn't one merge. `main` fast-forwards from live `d9cdcb3` to `3ef4b62` through five merges:
- billing `588388f`;
- tenant `d4dc664`, then `2d8aa76`, then `5692647`;
- T2 dropdown `999d716`;
- plus docs.

`git revert -m 1 3ef4b62` would undo only the last tenant correction, **6 of the 44** application files. It must never be used.

**Tool:** `bt-scoped-recovery.sh` (this folder), with `BASE=d9cdcb3…` and `RELEASE=3ef4b62…` pinned.
- It restores **every** application file changed anywhere in `BASE..RELEASE` to its `BASE` content: 44 files, 30 restored and 14 that the release added are removed.
- It keeps `docs/**` (including all evidence), root `*.md` (`CLAUDE.md`, `DESIGN-SYSTEM.md`, …) and `supabase/**`. This release has no migrations, and the rule protects any later ones.
- It leaves every newer unrelated change untouched.
- **Refusals:** a dirty tree (exit 2); a HEAD without the release, or a base that isn't the release's ancestor (exit 2); any commit after the release touching a release application file (exit 3, naming the commits).
- **Before committing,** it checks the staged tree: only release application files staged, each equal to its base version or absent. On a mismatch it exits 4 and resets.
- It makes one local commit, or with `--dry-run` only prints the plan.

**Rehearsal:** `bt-recovery-rehearsal.sh <repo> <new-scratch-dir> --with-build` (repeatable). The scenario:
- released `main` = `3ef4b62`;
- then later unrelated work **U**: an edit to `src/shared/dateFormat.ts` (not a release file), a new unit test, a fictional later migration file and a docs note;
- then the recovery;
- then U2, and reintroduction by reverting the recovery commit.

Full output: `bt-recovery-rehearsal-output.txt`. Result: **18 passed, 0 failed.**

| # | Check | Result |
|---|---|---|
| 1 | R1 gap shown: the final merge alone covers 6 of 44 application files | PASS |
| 2 | Refuses a dirty tree (exit 2, HEAD unchanged) | PASS |
| 3 | Refuses a HEAD without the release (exit 2) | PASS |
| 4 | Refuses a later edit to a release file (`LeaseForm.tsx`; exit 3, names the commit, HEAD unchanged) | PASS |
| 5 | A dry run changes nothing | PASS |
| 6 | Exactly one recovery commit, on top of U | PASS |
| 7 | The recovery commit touches only release application files | PASS |
| 8 | Nothing under `docs/`, `supabase/` or root `*.md` changed | PASS |
| 9 | All 44 release application files equal `d9cdcb3`, or are absent | PASS |
| 10 | **Application tree = base + U exactly** (every path outside the kept areas; 0 differences) | PASS |
| 11 | `docs/` (all evidence) and `supabase/` (including U's migration) identical to pre-recovery `main` | PASS |
| 12 | Root `*.md` identical to pre-recovery `main` | PASS |
| 13 | U's edit and test still present | PASS |
| 14 | Re-merging `3ef4b62` is a no-op ("Already up to date"), so a re-merge can't reintroduce the release | PASS |
| 15 | **Reintroduction** (`git revert <recovery commit>` after U2): all 44 files equal `3ef4b62` again | PASS |
| 16 | The reintroduced tree differs from `3ef4b62` only by U/U2 paths | PASS |
| 17 | Clean build of the recovery state; tests = base 280 + U's 1 = **281** | PASS |
| 18 | Clean build of the reintroduced state; tests = release 305 + U's 1 = **306** | PASS |

The tool ran under macOS's default bash 3.2.

**Not rehearsed,** because these need production or Netlify: the republish of G, the lock and unlock handling, deploy comparison and routes. The procedure is in the release packet §6. It follows the Stage 1 procedure, which T3 reviewed.
