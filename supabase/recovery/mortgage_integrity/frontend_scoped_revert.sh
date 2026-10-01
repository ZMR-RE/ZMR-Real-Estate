#!/bin/bash
# Mortgage integrity: scoped APPLICATION revert (T1). Local git only — it never pushes. DRAFT, not approved.
#
# Undoes the mortgage integrity release's application change relative to its live base, on top of whatever main is
# now, and KEEPS:
#   - supabase/** — the applied migration 20261004100000 (history must keep matching the database), its tests and the
#     recovery drafts;
#   - docs/** and root *.md (records);
#   - all newer unrelated work.
# A plain `git revert` of the release commit(s) would delete the applied migration file and its tests while the
# migration stays applied, so it must never be used or pushed.
#
# usage: frontend_scoped_revert.sh <repo-checkout-on-current-main> <release_commit> <live_base_commit>
#   <release_commit>   the exact commit that was released (what main was fast-forwarded to)
#   <live_base_commit> the live main it was based on (the previous release)
# Creates ONE commit on the checked-out branch. Refuses, changing nothing, if: the working tree isn't clean; the
# release isn't in HEAD's history; the base isn't an ancestor of the release; or any file to restore was changed by a
# later commit (then stop and fix forward with the same scope; don't widen it).
# Reintroduce the integrity application only by reverting THIS commit (`git revert <this commit>`).
set -euo pipefail
REPO=${1:?usage: frontend_scoped_revert.sh <repo> <release_commit> <live_base_commit>}
RELEASE=${2:?release commit required}
BASE=${3:?live base commit required}
cd "$REPO"
[ -z "$(git status --porcelain)" ] || { echo "REFUSED: working tree not clean" >&2; exit 2; }
git merge-base --is-ancestor "$RELEASE" HEAD || { echo "REFUSED: $RELEASE is not in HEAD's history" >&2; exit 2; }
git merge-base --is-ancestor "$BASE" "$RELEASE" || { echo "REFUSED: $BASE is not an ancestor of $RELEASE" >&2; exit 2; }

keep() { [[ "$1" == supabase/* || "$1" == docs/* || ( "$1" != */* && "$1" == *.md ) ]]; }
FILES=()
while IFS= read -r f; do keep "$f" || FILES+=("$f"); done < <(git diff --name-only "$BASE" "$RELEASE")
[ "${#FILES[@]}" -gt 0 ] || { echo "REFUSED: no application files in $BASE..$RELEASE" >&2; exit 2; }

LATER=$(git log --format=%h "$RELEASE"..HEAD -- "${FILES[@]}" | tr '\n' ' ')
[ -z "$LATER" ] || { echo "REFUSED: later commits touch mortgage-integrity application files: $LATER" >&2; exit 3; }

for f in "${FILES[@]}"; do
  if git cat-file -e "$BASE:$f" 2>/dev/null; then git checkout "$BASE" -- "$f"; else git rm -q -- "$f"; fi
done
# guard: nothing under supabase/** or docs/** may be part of this commit
if git diff --cached --name-only | grep -E '^(supabase|docs)/' >/dev/null; then
  git reset -q --hard HEAD; echo "REFUSED: the revert would touch supabase/** or docs/**" >&2; exit 4
fi
git commit -q -m "Revert mortgage balance-integrity application change (scoped; keeps the applied migration, its tests and records)

Restores the ${#FILES[@]} application files to their state in $BASE (live base of $RELEASE).
supabase/** (applied migration 20261004100000, database tests, recovery drafts), docs/** and root *.md are kept;
newer work is untouched. The database is NOT changed (frontend-only recovery; see supabase/recovery/mortgage_integrity/README.md).
Reintroduce the application only by reverting THIS commit."
echo "scoped revert commit: $(git rev-parse HEAD) (${#FILES[@]} files restored)"
