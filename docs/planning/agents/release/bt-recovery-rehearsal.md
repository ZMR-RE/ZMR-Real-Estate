# Billing + tenant release: scoped recovery rehearsal (T4, 2026-10-02)

**Current pin: application candidate `179e56b`** (re-pinned after the owner-review fixes added 4 application files). The earlier run against `3ef4b62` is kept below as history; its output is `bt-recovery-rehearsal-output.txt`.

**Scope:** a local scratch clone only (its remote removed). Nothing was pushed, fetched or deployed, and no account or database was touched.

**Finding R1** (T3): this release isn't one merge. `main` fast-forwards from live `d9cdcb3` to the application candidate `179e56b` through a chain of merges:
- billing `588388f`, then `1f0d41f`, `b98fae0` and `9c36aca` (owner-review fixes);
- tenant `d4dc664`, `2d8aa76`, `5692647`, then `8c3f882`, `04be3e7` and `16a99ed` (owner-review fixes);
- T2 dropdown `999d716`;
- plus docs.

`git revert -m 1 179e56b` would undo only the last billing fix, **2 of the 48** application files. It must never be used.

**Commits after `179e56b` on the branch are docs-only** (review page, release packet, these scripts). They don't change the application file set; the release packet records the check.

**Tool:** `bt-scoped-recovery.sh` (this folder), with `BASE=d9cdcb3…` and `RELEASE=179e56b…` pinned.
- It restores **every** application file changed anywhere in `BASE..RELEASE` to its `BASE` content: **48 files**. 33 are restored, and 15 that the release added are removed.
- It keeps `docs/**` (including all evidence), root `*.md` (`CLAUDE.md`, `DESIGN-SYSTEM.md`, …) and `supabase/**`. This release has no migrations, and the rule protects any later ones.
- It leaves every newer unrelated change untouched.
- **Refusals:** a dirty tree (exit 2); a HEAD without the release, or a base that isn't the release's ancestor (exit 2); any commit after the release touching a release application file (exit 3, naming the commits).
- **Before committing,** it checks the staged tree: only release application files staged, each equal to its base version or absent. On a mismatch it exits 4 and resets.
- It makes one local commit, or with `--dry-run` only prints the plan.

**Rehearsal:** `bt-recovery-rehearsal.sh <repo> <new-scratch-dir> --with-build` (repeatable). The scenario:
- released `main` = `179e56b`;
- then later unrelated work **U**: an edit to `src/shared/usStates.ts` (not a release file; `dateFormat.ts`, used before, is now part of the release), a new unit test, a fictional later migration file and a docs note;
- then the recovery;
- then U2, and reintroduction by reverting the recovery commit.

Full output: `bt-recovery-rehearsal-output-179e56b.txt`. Result: **18 passed, 0 failed.**

| # | Check | Result |
|---|---|---|
| 1 | R1 gap shown: the final merge alone covers 2 of 48 application files | PASS |
| 2 | Refuses a dirty tree (exit 2, HEAD unchanged) | PASS |
| 3 | Refuses a HEAD without the release (exit 2) | PASS |
| 4 | Refuses a later edit to a release file (`LeaseForm.tsx`; exit 3, names the commit, HEAD unchanged) | PASS |
| 5 | A dry run changes nothing | PASS |
| 6 | Exactly one recovery commit, on top of U | PASS |
| 7 | The recovery commit touches only release application files | PASS |
| 8 | Nothing under `docs/`, `supabase/` or root `*.md` changed | PASS |
| 9 | All 48 release application files equal `d9cdcb3`, or are absent | PASS |
| 10 | **Application tree = base + U exactly** (every path outside the kept areas; 0 differences) | PASS |
| 11 | `docs/` (all evidence) and `supabase/` (including U's migration) identical to pre-recovery `main` | PASS |
| 12 | Root `*.md` identical to pre-recovery `main` | PASS |
| 13 | U's edit and test still present | PASS |
| 14 | Re-merging `179e56b` is a no-op ("Already up to date"), so a re-merge can't reintroduce the release | PASS |
| 15 | **Reintroduction** (`git revert <recovery commit>` after U2): all 48 files equal `179e56b` again | PASS |
| 16 | The reintroduced tree differs from `179e56b` only by U/U2 paths | PASS |
| 17 | Clean build of the recovery state; tests = base 280 + U's 1 = **281** | PASS |
| 18 | Clean build of the reintroduced state; tests = release 308 + U's 1 = **309** | PASS |

The tool ran under macOS's default bash 3.2.

**Not rehearsed,** because these need production or Netlify: the republish of G, the lock and unlock handling, deploy comparison and routes. The procedure is in the release packet §6. It follows the Stage 1 procedure, which T3 reviewed.

**History:** the first run pinned `3ef4b62` (44 files, 30 restored and 14 removed; final merge alone 6 of 44; tests 280+1 and 305+1). Also 18/18 PASS. Superseded by the re-pin above.
